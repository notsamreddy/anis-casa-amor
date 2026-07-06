"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2, LogOut, Music2, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";

import {
  disconnectSpotify,
  getSpotifyPlaylists,
  getSpotifyPlaylistTracks,
  getSpotifyStatus,
  removeFromSpotifyPlaylist,
} from "@/actions/spotify";
import { SwipeCard } from "@/components/spotify-swipe-card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { SpotifyPlaylist, SpotifyTrack } from "@/lib/spotify";
import { cn } from "@/lib/utils";

function pickDefaultPlaylistId(playlists: SpotifyPlaylist[]) {
  return playlists[0]?.id ?? "";
}

type SpotifySectionProps = {
  initialConnected: boolean;
  initialPlaylists?: SpotifyPlaylist[];
  initialError?: string | null;
  justConnected?: boolean;
};

export function SpotifySection({
  initialConnected,
  initialPlaylists = [],
  initialError = null,
  justConnected = false,
}: SpotifySectionProps) {
  const [connected, setConnected] = useState(initialConnected || justConnected);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>(initialPlaylists);
  const editablePlaylists = useMemo(
    () => playlists.filter((playlist) => playlist.canEdit),
    [playlists],
  );
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    pickDefaultPlaylistId(editablePlaylists),
  );
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    justConnected ? "Spotify connected." : null,
  );
  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const hasAutoLoaded = useRef(false);

  const selectedPlaylist = useMemo(
    () => editablePlaylists.find((playlist) => playlist.id === selectedPlaylistId),
    [editablePlaylists, selectedPlaylistId],
  );

  const currentTrack = tracks[currentIndex] ?? null;
  const reviewedCount = currentIndex;
  const totalTrackCount = tracks.length;
  const remainingCount = Math.max(totalTrackCount - currentIndex, 0);
  const isFinished =
    totalTrackCount > 0 && reviewedCount >= totalTrackCount && !isLoadingTracks;

  useEffect(() => {
    if (editablePlaylists.length === 0) {
      if (selectedPlaylistId) {
        setSelectedPlaylistId("");
      }
      return;
    }

    if (!editablePlaylists.some((playlist) => playlist.id === selectedPlaylistId)) {
      setSelectedPlaylistId(pickDefaultPlaylistId(editablePlaylists));
    }
  }, [editablePlaylists, selectedPlaylistId]);

  const loadPlaylists = useCallback(async () => {
    setIsLoadingPlaylists(true);
    setError(null);

    try {
      const nextPlaylists = await getSpotifyPlaylists();
      setPlaylists(nextPlaylists);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load playlists.",
      );
    } finally {
      setIsLoadingPlaylists(false);
    }
  }, []);

  const loadReviewTracks = useCallback(
    async (playlistId: string, options?: { quiet?: boolean }) => {
      if (!playlistId) {
        return;
      }

      const playlist = editablePlaylists.find((entry) => entry.id === playlistId);
      if (!playlist) {
        setError("Choose one of your playlists to review.");
        setTracks([]);
        setCurrentIndex(0);
        return;
      }

      setIsLoadingTracks(true);
      setError(null);

      try {
        const playlistTracks = await getSpotifyPlaylistTracks(playlistId);
        setTracks(playlistTracks);
        setCurrentIndex(0);
        if (!options?.quiet) {
          setStatusMessage(
            playlistTracks.length > 0
              ? `Reviewing ${playlistTracks.length} tracks in “${playlist.name}”.`
              : `“${playlist.name}” is empty.`,
          );
        }
      } catch (loadError) {
        setTracks([]);
        setCurrentIndex(0);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load playlist tracks.",
        );
      } finally {
        setIsLoadingTracks(false);
      }
    },
    [editablePlaylists],
  );

  useEffect(() => {
    if (!connected || hasAutoLoaded.current || !selectedPlaylistId) {
      return;
    }

    hasAutoLoaded.current = true;
    void loadReviewTracks(selectedPlaylistId, { quiet: true });
  }, [connected, selectedPlaylistId, loadReviewTracks]);

  const handlePlaylistChange = (playlistId: string | null) => {
    if (!playlistId) {
      return;
    }

    setSelectedPlaylistId(playlistId);
    setStatusMessage(null);
    setError(null);
    void loadReviewTracks(playlistId);
  };

  const advanceTrack = () => {
    setCurrentIndex((index) => index + 1);
  };

  const handleSwipeRight = () => {
    if (!currentTrack || !selectedPlaylistId) {
      return;
    }

    const track = currentTrack;
    setStatusMessage(`Kept “${track.name}”.`);
    advanceTrack();
  };

  const handleSwipeLeft = () => {
    if (!currentTrack || !selectedPlaylistId) {
      return;
    }

    const track = currentTrack;

    startTransition(async () => {
      try {
        await removeFromSpotifyPlaylist(selectedPlaylistId, track.uri);
        setError(null);
        setStatusMessage(`Removed “${track.name}”.`);
        advanceTrack();
      } catch (actionError) {
        setError(
          actionError instanceof Error
            ? actionError.message
            : "Could not remove track.",
        );
      }
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      try {
        await disconnectSpotify();
        setConnected(false);
        setPlaylists([]);
        setSelectedPlaylistId("");
        setTracks([]);
        setCurrentIndex(0);
        hasAutoLoaded.current = false;
        setStatusMessage("Disconnected from Spotify.");
      } catch (disconnectError) {
        setError(
          disconnectError instanceof Error
            ? disconnectError.message
            : "Could not disconnect.",
        );
      }
    });
  };

  const handleRefreshConnection = () => {
    startTransition(async () => {
      const status = await getSpotifyStatus();
      setConnected(status.connected);
      if (status.connected) {
        await loadPlaylists();
      }
    });
  };

  const playlistLabel = selectedPlaylist
    ? `${selectedPlaylist.name} · ${selectedPlaylist.trackCount} tracks`
    : "Select a playlist";

  if (!connected) {
    return (
      <div className="space-y-5">
        <header className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Music2 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Spotify Swipe</h1>
            <p className="text-sm text-muted-foreground">
              Connect Spotify to review and clean up playlists.
            </p>
          </div>
        </header>

        {error ? <FeedbackBanner tone="error" message={error} /> : null}

        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Sparkles className="mx-auto mb-3 size-7 text-emerald-400" />
          <p className="mb-4 text-sm text-muted-foreground">
            Pick a playlist, swipe left to remove songs you do not want, and right
            to keep them.
          </p>
          <Link
            href="/api/spotify/connect"
            className={cn(buttonVariants(), "bg-emerald-600 hover:bg-emerald-500")}
          >
            Connect Spotify
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Music2 className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Spotify Swipe</h1>
            <p className="text-sm text-muted-foreground">
              {selectedPlaylist
                ? `Reviewing “${selectedPlaylist.name}”`
                : "Review a playlist"}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDisconnect}
          disabled={isPending}
          className="shrink-0 text-muted-foreground"
          aria-label="Disconnect Spotify"
        >
          <LogOut className="size-4" />
        </Button>
      </header>

      {error ? <FeedbackBanner tone="error" message={error} /> : null}
      {statusMessage ? <FeedbackBanner tone="success" message={statusMessage} /> : null}

      <section className="space-y-3">
        {isLoadingTracks ? (
          <div className="flex h-[28rem] items-center justify-center rounded-2xl border border-border bg-card/40">
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          </div>
        ) : currentTrack ? (
          <>
            <p className="text-center text-sm text-muted-foreground">
              {reviewedCount + 1} of {totalTrackCount} · {remainingCount} left
            </p>
            <SwipeCard
              key={`${currentTrack.id}-${currentIndex}`}
              track={currentTrack}
              leftLabel="Remove"
              rightLabel="Keep"
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              disabled={isPending}
            />
          </>
        ) : (
          <div className="flex h-[28rem] items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
            {isFinished
              ? `Finished reviewing “${selectedPlaylist?.name ?? "this playlist"}”.`
              : selectedPlaylist
                ? `No tracks loaded yet for “${selectedPlaylist.name}”.`
                : "Choose one of your playlists below to start reviewing."}
          </div>
        )}

        {isFinished ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void loadReviewTracks(selectedPlaylistId)}
            disabled={!selectedPlaylistId}
          >
            <RefreshCw className="size-4" />
            Review again
          </Button>
        ) : null}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium">Playlist</label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-muted-foreground"
            onClick={() => void loadReviewTracks(selectedPlaylistId, { quiet: true })}
            disabled={!selectedPlaylistId || isLoadingTracks}
          >
            <RefreshCw className="size-3.5" />
            Reload
          </Button>
        </div>

        {editablePlaylists.length > 0 ? (
          <Select
            value={selectedPlaylistId || null}
            onValueChange={handlePlaylistChange}
            disabled={isLoadingPlaylists}
          >
            <SelectTrigger className="w-full">
              <span className="truncate text-left text-sm">
                {isLoadingPlaylists ? "Loading playlists…" : playlistLabel}
              </span>
            </SelectTrigger>
            <SelectContent>
              {editablePlaylists.map((playlist) => (
                <SelectItem key={playlist.id} value={playlist.id}>
                  {playlist.name} ({playlist.trackCount})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="text-sm text-muted-foreground">
            {isLoadingPlaylists
              ? "Loading playlists…"
              : "No editable playlists found. Create one in Spotify first."}
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Swipe left to remove, right to keep. Only playlists you own or
          collaborate on can be edited.
        </p>
      </section>

      <button
        type="button"
        onClick={handleRefreshConnection}
        disabled={isPending}
        className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        Refresh connection
      </button>
    </div>
  );
}

function FeedbackBanner({
  tone,
  message,
}: {
  tone: "error" | "success";
  message: string;
}) {
  return (
    <p
      className={cn(
        "rounded-lg px-3 py-2 text-sm",
        tone === "error"
          ? "border border-destructive/40 bg-destructive/10 text-destructive"
          : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      )}
    >
      {message}
    </p>
  );
}
