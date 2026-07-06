"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Pause, Play } from "lucide-react";

import {
  getSpotifyTrackDuration,
  getSpotifyTrackPreview,
} from "@/actions/spotify";
import {
  getSpotifyPlaybackState,
  getSpotifyPlaybackVolume,
  getSpotifyPlayer,
  pauseSpotifyPlayback,
  playSpotifyTrack,
  seekSpotifyPlayback,
  setSpotifyPlaybackVolume,
  subscribeToSpotifyPlayerError,
  subscribeToSpotifyPlayerState,
  toggleSpotifyPlayback,
} from "@/lib/spotify-player-client";
import { SpotifyVolumeDial } from "@/components/spotify-volume-dial";
import { cn } from "@/lib/utils";

const DIAL_SIZE = 148;
const DIAL_RADIUS = 62;
const DIAL_CENTER = DIAL_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS;

type SpotifySeekDialProps = {
  trackId: string;
  trackUri: string;
  trackName: string;
  durationMs: number;
  previewUrl: string | null;
  spotifyUrl: string;
  overlay?: boolean;
};

type PlaybackMode = "preview" | "sdk";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getProgressFromPointer(
  clientX: number,
  clientY: number,
  rect: DOMRect,
) {
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const angle = Math.atan2(clientY - centerY, clientX - centerX);
  let progress = (angle + Math.PI / 2) / (2 * Math.PI);
  if (progress < 0) {
    progress += 1;
  }
  return Math.min(1, Math.max(0, progress));
}

function getKnobPosition(progress: number) {
  const angle = progress * 2 * Math.PI - Math.PI / 2;
  return {
    x: DIAL_CENTER + DIAL_RADIUS * Math.cos(angle),
    y: DIAL_CENTER + DIAL_RADIUS * Math.sin(angle),
  };
}

function getDurationSecondsFromState(state: Spotify.PlaybackState) {
  if (state.duration > 0) {
    return state.duration / 1000;
  }

  const trackDurationMs = state.track_window.current_track.duration_ms;
  if (trackDurationMs > 0) {
    return trackDurationMs / 1000;
  }

  return 0;
}

async function waitForPlaybackState(trackUri: string, attempts = 25) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const state = await getSpotifyPlaybackState();
    if (state?.track_window.current_track.uri === trackUri) {
      return state;
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, 200);
    });
  }

  return null;
}

export function SpotifySeekDial({
  trackId,
  trackUri,
  trackName,
  durationMs,
  previewUrl,
  spotifyUrl,
  overlay = false,
}: SpotifySeekDialProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const dialRef = useRef<HTMLDivElement>(null);
  const isSeekingRef = useRef(false);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string | null>(
    previewUrl,
  );
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>(
    previewUrl ? "preview" : "sdk",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const [playbackReady, setPlaybackReady] = useState(false);
  const [isStartingPlayback, setIsStartingPlayback] = useState(false);
  const [volume, setVolume] = useState(getSpotifyPlaybackVolume);

  const displayedTime =
    isSeeking || (playbackMode === "sdk" && !playbackReady)
      ? seekProgress * duration
      : currentTime;

  const progress =
    duration > 0
      ? isSeeking || (playbackMode === "sdk" && !playbackReady && seekProgress > 0)
        ? seekProgress
        : Math.min(1, currentTime / duration)
      : 0;

  const knob = getKnobPosition(progress);
  const canPlay = !isLoading && !isStartingPlayback;
  const canSeek = canPlay && duration > 0;

  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }

    void setSpotifyPlaybackVolume(volume);
  }, [volume]);

  const handleVolumeChange = useCallback((nextVolume: number) => {
    setVolume(nextVolume);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setSeekProgress(0);
    setIsSeeking(false);
    setPlaybackReady(false);
    setPlayerError(null);
    setIsLoading(true);

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }

    void pauseSpotifyPlayback();

    (async () => {
      let nextPreview = previewUrl;
      if (!nextPreview) {
        try {
          nextPreview = await getSpotifyTrackPreview(trackId);
        } catch {
          nextPreview = null;
        }
      }

      if (cancelled) {
        return;
      }

      if (nextPreview) {
        setResolvedPreviewUrl(nextPreview);
        setPlaybackMode("preview");
        setIsLoading(false);
        return;
      }

      setResolvedPreviewUrl(null);
      setPlaybackMode("sdk");

      let trackDurationMs = durationMs;
      if (trackDurationMs <= 0) {
        try {
          trackDurationMs = await getSpotifyTrackDuration(trackId);
        } catch {
          trackDurationMs = 0;
        }
      }

      if (cancelled) {
        return;
      }

      if (trackDurationMs > 0) {
        setDuration(trackDurationMs / 1000);
      }

      try {
        await getSpotifyPlayer();
        if (!cancelled) {
          setIsLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setPlayerError(
            error instanceof Error
              ? error.message
              : "Could not start Spotify playback.",
          );
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [trackId, trackUri, previewUrl, durationMs]);

  useEffect(() => {
    if (playbackMode !== "sdk") {
      return;
    }

    const unsubscribeState = subscribeToSpotifyPlayerState((state) => {
      if (!state) {
        setIsPlaying(false);
        setPlaybackReady(false);
        return;
      }

      if (state.track_window.current_track.uri !== trackUri) {
        return;
      }

      setPlaybackReady(true);

      const nextDuration = getDurationSecondsFromState(state);
      if (nextDuration > 0) {
        setDuration(nextDuration);
      }

      if (!isSeekingRef.current) {
        setCurrentTime(state.position / 1000);
        setSeekProgress(0);
      }
      setIsPlaying(!state.paused);
    });

    const unsubscribeError = subscribeToSpotifyPlayerError((message) => {
      if (message.toLowerCase().includes("no list was loaded")) {
        return;
      }
      setPlayerError(message);
    });

    return () => {
      unsubscribeState();
      unsubscribeError();
    };
  }, [playbackMode, trackUri]);

  const applySeek = useCallback(
    (nextProgress: number) => {
      const clamped = Math.min(1, Math.max(0, nextProgress));
      setSeekProgress(clamped);

      if (playbackMode === "preview") {
        const audio = audioRef.current;
        if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
          return;
        }

        audio.currentTime = clamped * audio.duration;
        setCurrentTime(audio.currentTime);
        return;
      }

      if (duration > 0) {
        if (playbackMode === "sdk" && !playbackReady) {
          setSeekProgress(clamped);
          return;
        }

        void seekSpotifyPlayback(clamped * duration * 1000);
        setCurrentTime(clamped * duration);
      }
    },
    [duration, playbackMode, playbackReady],
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canSeek || !dialRef.current) {
      return;
    }

    event.stopPropagation();
    setIsSeeking(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    applySeek(
      getProgressFromPointer(
        event.clientX,
        event.clientY,
        dialRef.current.getBoundingClientRect(),
      ),
    );
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeeking || !dialRef.current) {
      return;
    }

    event.stopPropagation();
    applySeek(
      getProgressFromPointer(
        event.clientX,
        event.clientY,
        dialRef.current.getBoundingClientRect(),
      ),
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isSeeking) {
      return;
    }

    event.stopPropagation();
    setIsSeeking(false);
  };

  const togglePlayback = async () => {
    if (!canPlay) {
      return;
    }

    setPlayerError(null);

    if (playbackMode === "preview") {
      const audio = audioRef.current;
      if (!audio || !resolvedPreviewUrl) {
        return;
      }

      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        return;
      }

      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
        setPlayerError("Could not play this preview.");
      }
      return;
    }

    try {
      if (!isPlaying) {
        setIsStartingPlayback(true);
        const startProgress = seekProgress;
        await playSpotifyTrack(trackUri);
        const state = await waitForPlaybackState(trackUri);
        if (state) {
          const nextDuration = getDurationSecondsFromState(state);
          const trackDurationSec = nextDuration > 0 ? nextDuration : duration;
          if (nextDuration > 0) {
            setDuration(nextDuration);
          }

          if (startProgress > 0 && trackDurationSec > 0) {
            await seekSpotifyPlayback(startProgress * trackDurationSec * 1000);
            setCurrentTime(startProgress * trackDurationSec);
            setSeekProgress(0);
          } else {
            setCurrentTime(state.position / 1000);
          }

          setPlaybackReady(true);
          setIsPlaying(!state.paused);
        } else {
          throw new Error("Playback did not start. Try again.");
        }
        return;
      }

      const toggled = await toggleSpotifyPlayback();
      if (!toggled) {
        setIsPlaying(false);
        setPlaybackReady(false);
        throw new Error("Playback is not active. Press play to start.");
      }
    } catch (error) {
      setIsPlaying(false);
      setPlaybackReady(false);
      setPlayerError(
        error instanceof Error
          ? error.message
          : "Could not play this track.",
      );
    } finally {
      setIsStartingPlayback(false);
    }
  };

  const messageClass = overlay ? "text-white/80" : "text-muted-foreground";
  const linkClass = overlay
    ? "text-emerald-300 hover:text-emerald-200"
    : "text-emerald-400 hover:text-emerald-300";

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center gap-2", messageClass)}>
        <Loader2 className="size-8 animate-spin" />
        <p className="text-sm">Loading playback…</p>
      </div>
    );
  }

  if (playerError && playbackMode === "sdk" && !duration) {
    return (
      <div className="flex max-w-[220px] flex-col items-center gap-2 px-4 text-center">
        <p className={cn("text-sm", overlay ? "text-white/90" : "text-destructive")}>
          {playerError}
        </p>
        <p className={cn("text-xs", messageClass)}>
          No 30s preview for this track. Reconnect Spotify to try full playback
          (Spotify Premium required).
        </p>
        <a
          href="/api/spotify/connect"
          className={cn("text-sm", linkClass)}
          onClick={(event) => event.stopPropagation()}
        >
          Reconnect Spotify
        </a>
        <a
          href={spotifyUrl}
          target="_blank"
          rel="noreferrer"
          className={cn("inline-flex items-center gap-1 text-sm", linkClass)}
          onClick={(event) => event.stopPropagation()}
        >
          Open in Spotify
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    );
  }

  const dial = (
    <>
      {playbackMode === "preview" && resolvedPreviewUrl ? (
        <audio
          ref={audioRef}
          src={resolvedPreviewUrl}
          preload="metadata"
          onLoadedMetadata={(event) => {
            event.currentTarget.volume = volume;
            setDuration(event.currentTarget.duration);
          }}
          onTimeUpdate={(event) => {
            if (!isSeekingRef.current) {
              setCurrentTime(event.currentTarget.currentTime);
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
          }}
          onPause={() => {
            setIsPlaying(false);
          }}
          onPlay={() => {
            setIsPlaying(true);
          }}
        />
      ) : null}

      <div className="flex flex-col items-center gap-3">
        {playerError ? (
          <p className={cn("max-w-[200px] text-center text-xs", messageClass)}>
            {playerError}
          </p>
        ) : null}

        <div className="flex items-end justify-center gap-3">
          <div
            ref={dialRef}
            className={cn(
              "relative touch-none select-none",
              !canSeek && "opacity-60",
            )}
            style={{ width: DIAL_SIZE, height: DIAL_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label={`Seek playback for ${trackName}`}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
          <svg
            width={DIAL_SIZE}
            height={DIAL_SIZE}
            className="absolute inset-0"
            aria-hidden
          >
            {Array.from({ length: 24 }).map((_, index) => {
              const tickProgress = index / 24;
              const tickAngle = tickProgress * 2 * Math.PI - Math.PI / 2;
              const inner = DIAL_RADIUS - 8;
              const outer = DIAL_RADIUS - 2;
              const x1 = DIAL_CENTER + inner * Math.cos(tickAngle);
              const y1 = DIAL_CENTER + inner * Math.sin(tickAngle);
              const x2 = DIAL_CENTER + outer * Math.cos(tickAngle);
              const y2 = DIAL_CENTER + outer * Math.sin(tickAngle);

              return (
                <line
                  key={index}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={cn(
                    overlay ? "stroke-white/25" : "stroke-border",
                    tickProgress <= progress &&
                      (overlay ? "stroke-emerald-300" : "stroke-emerald-500/70"),
                  )}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              );
            })}

            <circle
              cx={DIAL_CENTER}
              cy={DIAL_CENTER}
              r={DIAL_RADIUS}
              fill="none"
              className={overlay ? "stroke-white/20" : "stroke-muted"}
              strokeWidth="8"
              strokeOpacity={overlay ? 1 : 0.35}
            />
            <circle
              cx={DIAL_CENTER}
              cy={DIAL_CENTER}
              r={DIAL_RADIUS}
              fill="none"
              className={overlay ? "stroke-emerald-400" : "stroke-emerald-500"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
              transform={`rotate(-90 ${DIAL_CENTER} ${DIAL_CENTER})`}
            />
            <circle
              cx={knob.x}
              cy={knob.y}
              r="9"
              className={cn(
                overlay
                  ? "fill-emerald-300 stroke-white/80 stroke-[3]"
                  : "fill-emerald-400 stroke-background stroke-[3]",
              )}
            />
          </svg>

          <button
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onPointerUp={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              void togglePlayback();
            }}
            disabled={!canPlay}
            className={cn(
              "absolute inset-0 z-10 m-auto flex size-16 items-center justify-center rounded-full shadow-sm transition-colors disabled:opacity-50",
              overlay
                ? "border border-white/30 bg-black/35 text-white hover:bg-black/50"
                : "border border-emerald-500/30 bg-background/90 text-emerald-400 hover:bg-emerald-500/10",
            )}
            aria-label={isPlaying ? "Pause track" : "Play track"}
          >
            {isStartingPlayback ? (
              <Loader2 className="size-7 animate-spin" />
            ) : isPlaying ? (
              <Pause className="size-7" />
            ) : (
              <Play className="ml-0.5 size-7" />
            )}
          </button>
          </div>

          <SpotifyVolumeDial
            overlay={overlay}
            volume={volume}
            onVolumeChange={handleVolumeChange}
            disabled={isLoading}
          />
        </div>

        <div
          className={cn(
            "flex w-full max-w-[148px] items-center justify-between text-sm tabular-nums",
            messageClass,
          )}
        >
          <span>{formatTime(displayedTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
        </div>

        {playbackMode === "preview" ? (
          <p className={cn("text-center text-xs", messageClass)}>30s preview</p>
        ) : (
          <p className={cn("text-center text-xs", messageClass)}>
            {isPlaying ? "Full track" : "Tap play for full track"}
          </p>
        )}
      </div>
    </>
  );

  if (overlay) {
    return (
      <div
        className="relative z-10 flex flex-col items-center"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {dial}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-border bg-card/80 px-4 py-4"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Player</span>
        <span>Spin to seek · volume on the right</span>
      </div>
      {dial}
    </div>
  );
}
