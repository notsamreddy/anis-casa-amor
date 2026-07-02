"use client";

import { useEffect, useState } from "react";
import { Film, Loader2, Star, Tv } from "lucide-react";

import { getMediaDetails } from "@/actions/media-search";
import type { Movie } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MEDIA_PRIORITY_LABELS,
  MEDIA_PRIORITY_THEME,
  MEDIA_TYPE_LABELS,
} from "@/lib/media-types";
import type { MediaDetails } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

type MovieDetailDialogProps = {
  movie: Movie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MovieDetailDialog({
  movie,
  open,
  onOpenChange,
}: MovieDetailDialogProps) {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !movie) {
      setDetails(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!movie.tmdbId) {
      setDetails(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    void getMediaDetails(movie.tmdbId, movie.mediaType)
      .then((result) => {
        if (result.ok) {
          setDetails(result.details);
          setError(null);
          return;
        }

        setDetails(null);
        setError(result.message);
      })
      .catch(() => {
        setDetails(null);
        setError("Could not load details right now.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [open, movie]);

  if (!movie) {
    return null;
  }

  const TypeIcon = movie.mediaType === "movie" ? Film : Tv;
  const priorityTheme = MEDIA_PRIORITY_THEME[movie.priority];
  const displayTitle = details?.title ?? movie.title;
  const displayPoster = details?.posterUrl ?? movie.posterUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90dvh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        overlayClassName="bg-black/40 supports-backdrop-filter:backdrop-blur-md"
      >
        <DialogHeader className="shrink-0 border-b px-4 py-4">
          <DialogTitle>{displayTitle}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 [-webkit-overflow-scrolling:touch]">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading details...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-4">
                {displayPoster ? (
                  <img
                    src={displayPoster}
                    alt={`${displayTitle} poster`}
                    width={96}
                    height={144}
                    className="h-36 w-24 shrink-0 rounded-lg bg-muted object-cover"
                  />
                ) : (
                  <div className="flex h-36 w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <TypeIcon className="size-8" />
                  </div>
                )}

                <div className="min-w-0 space-y-2">
                  {details?.tagline && (
                    <p className="text-sm text-muted-foreground italic">
                      {details.tagline}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="gap-1">
                      <TypeIcon className="size-3" />
                      {MEDIA_TYPE_LABELS[movie.mediaType]}
                    </Badge>
                    <Badge className={cn("font-medium", priorityTheme.chip)}>
                      {MEDIA_PRIORITY_LABELS[movie.priority]}
                    </Badge>
                    {movie.completed && (
                      <Badge variant="outline">Watched</Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    {details?.year && <p>{details.year}</p>}
                    {details?.runtime && <p>{details.runtime}</p>}
                    {details?.rating != null && (
                      <p className="flex items-center gap-1">
                        <Star className="size-3.5 fill-amber-400 text-amber-400" />
                        {details.rating}/10
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {details?.genres && details.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {details.genres.map((genre) => (
                    <Badge key={genre} variant="outline">
                      {genre}
                    </Badge>
                  ))}
                </div>
              )}

              {error ? (
                <p className="text-sm text-muted-foreground">{error}</p>
              ) : details?.overview ? (
                <p className="text-sm leading-relaxed">{details.overview}</p>
              ) : !movie.tmdbId ? (
                <p className="text-sm text-muted-foreground">
                  This item was added without search data, so plot details
                  aren&apos;t available.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No overview available.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t bg-muted/50 px-4 py-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
