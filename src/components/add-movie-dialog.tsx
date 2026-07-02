"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import { Film, Loader2, Search, Tv } from "lucide-react";

import { searchMedia } from "@/actions/media-search";
import { createMovie } from "@/actions/movies";
import type { MediaPriority, MediaType } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MEDIA_PRIORITIES,
  MEDIA_PRIORITY_LABELS,
  MEDIA_PRIORITY_THEME,
  MEDIA_TYPE_LABELS,
  MEDIA_TYPES,
} from "@/lib/media-types";
import type { MediaSearchResult } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

type AddMovieDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SearchResultItem = memo(function SearchResultItem({
  result,
  isSelected,
  onSelect,
}: {
  result: MediaSearchResult;
  isSelected: boolean;
  onSelect: (result: MediaSearchResult) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
                      className={cn(
        "flex w-full min-h-14 items-center gap-3 rounded-lg border p-3 text-left sm:min-h-0 sm:p-2",
        isSelected
          ? "border-fuchsia-500/50 bg-fuchsia-500/10"
          : "border-transparent hover:bg-muted/50",
      )}
    >
      <SearchResultPoster title={result.title} posterUrl={result.posterUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{result.title}</p>
        <p className="text-xs text-muted-foreground">
          {result.year ?? "Unknown year"} ·{" "}
          {MEDIA_TYPE_LABELS[result.mediaType]}
        </p>
      </div>
    </button>
  );
});

function SearchResultPoster({
  title,
  posterUrl,
}: {
  title: string;
  posterUrl: string | null;
}) {
  if (!posterUrl) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Film className="size-4" />
      </div>
    );
  }

  return (
    <img
      src={posterUrl}
      alt={`${title} poster`}
      width={32}
      height={48}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="h-12 w-8 shrink-0 rounded-md bg-muted object-cover"
    />
  );
}

export function AddMovieDialog({ open, onOpenChange }: AddMovieDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [priority, setPriority] = useState<MediaPriority>("medium");
  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MediaSearchResult | null>(null);
  const searchRequestRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setMediaType("movie");
      setPriority("medium");
      setResults([]);
      setSelected(null);
      setSearchError(null);
      setIsSearching(false);
      searchRequestRef.current += 1;
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelected(null);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const requestId = ++searchRequestRef.current;
    setIsSearching(true);
    setSearchError(null);

    const timeout = setTimeout(() => {
      void searchMedia(trimmed, mediaType)
        .then((items) => {
          if (requestId !== searchRequestRef.current) {
            return;
          }
          setResults(items);
          setSearchError(null);
        })
        .catch(() => {
          if (requestId !== searchRequestRef.current) {
            return;
          }
          setResults([]);
          setSearchError("Search is unavailable right now.");
        })
        .finally(() => {
          if (requestId === searchRequestRef.current) {
            setIsSearching(false);
          }
        });
    }, 350);

    return () => clearTimeout(timeout);
  }, [query, mediaType, open]);

  const handleSelect = useCallback((result: MediaSearchResult) => {
    setSelected(result);
  }, []);

  function handleAdd() {
    if (!selected) {
      return;
    }

    startTransition(async () => {
      await createMovie({
        title: selected.title,
        mediaType: selected.mediaType,
        priority,
        posterUrl: selected.posterUrl,
        tmdbId: selected.tmdbId,
      });
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-md"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-4">
          <DialogTitle>Add to watchlist</DialogTitle>
          <DialogDescription>
            Search for a movie or series, then pick the right one.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 space-y-4 p-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {MEDIA_TYPES.map((type) => {
                  const selectedType = mediaType === type;
                  const Icon = type === "movie" ? Film : Tv;

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMediaType(type)}
                      className={cn(
                        "flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-3 text-base font-medium sm:min-h-0 sm:py-2.5 sm:text-sm",
                        selectedType
                          ? "border-fuchsia-500/50 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400"
                          : "border-border text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      <Icon className="size-4" />
                      {MEDIA_TYPE_LABELS[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="media-search">Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="media-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="e.g. Spider-Man"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
            <Label className="mb-2 shrink-0">Results</Label>
            <div
              role="listbox"
              aria-label="Search results"
              className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain rounded-lg border p-2 [-webkit-overflow-scrolling:touch]"
            >
              {query.trim().length < 2 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search.
                </p>
              ) : isSearching ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Searching...
                </div>
              ) : searchError ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {searchError}
                </p>
              ) : results.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </p>
              ) : (
                <div className="space-y-1">
                  {results.map((result) => (
                    <SearchResultItem
                      key={result.tmdbId}
                      result={result}
                      isSelected={selected?.tmdbId === result.tmdbId}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 space-y-2 px-4 pb-4">
            <Label>Priority</Label>
            <div className="grid grid-cols-3 gap-2">
              {MEDIA_PRIORITIES.map((level) => {
                const theme = MEDIA_PRIORITY_THEME[level];
                const isSelected = priority === level;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPriority(level)}
                    className={cn(
                      "min-h-11 rounded-lg border px-2 py-3 text-base font-medium sm:min-h-0 sm:py-2.5 sm:text-sm",
                      isSelected
                        ? cn("ring-2", theme.ring, theme.chip)
                        : "border-border text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    {MEDIA_PRIORITY_LABELS[level]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-muted/50 px-4 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isPending || !selected}
            onClick={handleAdd}
          >
            {isPending ? "Adding..." : "Add to list"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type MediaPosterProps = {
  title: string;
  posterUrl: string | null;
  size?: "sm" | "md";
  className?: string;
};

export function MediaPoster({
  title,
  posterUrl,
  size = "md",
  className,
}: MediaPosterProps) {
  const dimensions = size === "sm" ? "size-12" : "size-16";

  if (!posterUrl) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
          dimensions,
          className,
        )}
      >
        <Film className={size === "sm" ? "size-4" : "size-5"} />
      </div>
    );
  }

  return (
    <Image
      src={posterUrl}
      alt={`${title} poster`}
      width={size === "sm" ? 48 : 64}
      height={size === "sm" ? 72 : 96}
      className={cn(
        "shrink-0 rounded-md object-cover",
        size === "sm" ? "h-12 w-8" : "h-16 w-11",
        className,
      )}
    />
  );
}
