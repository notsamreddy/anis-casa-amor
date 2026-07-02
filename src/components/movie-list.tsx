"use client";

import { useMemo, useState, useTransition } from "react";
import { Film, Plus, Shuffle, Trash2, Tv } from "lucide-react";

import { AddMovieDialog, MediaPoster } from "@/components/add-movie-dialog";
import { MovieDetailDialog } from "@/components/movie-detail-dialog";
import {
  deleteMovie,
  toggleMovieCompletion,
  updateMoviePriority,
} from "@/actions/movies";
import type { MediaPriority, MediaType, Movie } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MEDIA_PRIORITIES,
  MEDIA_PRIORITY_LABELS,
  MEDIA_PRIORITY_THEME,
  MEDIA_TYPE_LABELS,
  MEDIA_TYPES,
  sortWatchlistItems,
} from "@/lib/media-types";
import { cn } from "@/lib/utils";

type MovieListProps = {
  movies: Movie[];
};

function pickRandomExcluding<T extends { id: number }>(
  items: T[],
  excludeId?: number,
): T | null {
  if (items.length === 0) {
    return null;
  }

  const pool =
    excludeId !== undefined
      ? items.filter((item) => item.id !== excludeId)
      : items;

  if (pool.length === 0) {
    return items[0] ?? null;
  }

  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function MovieList({ movies }: MovieListProps) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [filterType, setFilterType] = useState<MediaType>("movie");
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);
  const [randomPick, setRandomPick] = useState<Movie | null>(null);
  const [detailMovie, setDetailMovie] = useState<Movie | null>(null);

  const filteredMovies = useMemo(
    () => sortWatchlistItems(movies.filter((movie) => movie.mediaType === filterType)),
    [movies, filterType],
  );

  const unwatchedMovies = useMemo(
    () => filteredMovies.filter((movie) => !movie.completed),
    [filteredMovies],
  );

  const completedCount = filteredMovies.filter((movie) => movie.completed).length;
  const total = filteredMovies.length;
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  const hasAnyMovies = movies.length > 0;

  function handleToggle(id: number, checked: boolean) {
    startTransition(async () => {
      await toggleMovieCompletion(id, checked);
    });
  }

  function handlePriorityChange(id: number, priority: MediaPriority) {
    startTransition(async () => {
      await updateMoviePriority(id, priority);
    });
  }

  function handlePickRandom() {
    const pick = pickRandomExcluding(unwatchedMovies);
    if (pick) {
      setRandomPick(pick);
    }
  }

  function handlePickAgain() {
    const pick = pickRandomExcluding(unwatchedMovies, randomPick?.id);
    if (pick) {
      setRandomPick(pick);
    }
  }

  function handleConfirmDelete() {
    if (!movieToDelete) {
      return;
    }

    startTransition(async () => {
      await deleteMovie(movieToDelete.id);
      setMovieToDelete(null);
    });
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-600 text-white">
            <Film className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Watchlist</h1>
            <p className="text-muted-foreground">Movies and series to watch</p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={unwatchedMovies.length === 0}
            onClick={handlePickRandom}
          >
            <Shuffle className="size-4" />
            Pick random
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            Add movie
          </Button>
        </div>
      </section>

      {hasAnyMovies && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border p-1">
          {MEDIA_TYPES.map((type) => {
            const selected = filterType === type;
            const Icon = type === "movie" ? Film : Tv;
            const count = movies.filter((movie) => movie.mediaType === type).length;

            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  selected
                    ? "bg-fuchsia-600 text-white"
                    : "text-muted-foreground hover:bg-muted/50",
                )}
              >
                <Icon className="size-4" />
                {MEDIA_TYPE_LABELS[type]}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                    selected
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {filteredMovies.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {hasAnyMovies
              ? `No ${MEDIA_TYPE_LABELS[filterType].toLowerCase()}s on your list yet.`
              : "Nothing on your list yet. Tap Add movie to get started."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {completedCount} of {total} watched
              </span>
              <span className="tabular-nums text-muted-foreground">
                {isPending ? "Saving…" : `${percent}%`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-fuchsia-600 transition-all duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredMovies.map((movie) => {
              const theme = MEDIA_PRIORITY_THEME[movie.priority];
              const isRandomHighlight = randomPick?.id === movie.id;

              return (
                <Card
                  key={movie.id}
                  className={cn(
                    "relative overflow-hidden py-0 transition-colors",
                    movie.completed && theme.tint,
                    isRandomHighlight && "ring-2 ring-fuchsia-500/50",
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 w-1",
                      theme.accent,
                    )}
                  />
                  <CardContent className="flex items-start gap-3.5 p-4 pl-5">
                    <Checkbox
                      id={`movie-${movie.id}`}
                      checked={movie.completed}
                      disabled={isPending}
                      className="mt-1 size-6 shrink-0"
                      onCheckedChange={(checked) =>
                        handleToggle(movie.id, checked === true)
                      }
                    />

                    <div className="flex min-w-0 flex-1 gap-3">
                      <button
                        type="button"
                        onClick={() => setDetailMovie(movie)}
                        className="shrink-0 hover:opacity-90"
                      >
                        <MediaPoster
                          title={movie.title}
                          posterUrl={movie.posterUrl}
                          size="md"
                          className={cn(movie.completed && "opacity-60")}
                        />
                      </button>

                      <div className="min-w-0 flex-1 space-y-2">
                        <button
                          type="button"
                          onClick={() => setDetailMovie(movie)}
                          className="w-full text-left hover:opacity-90"
                        >
                          <p
                            className={cn(
                              "text-base font-semibold tracking-tight transition-colors",
                              movie.completed &&
                                "text-muted-foreground line-through",
                            )}
                          >
                            {movie.title}
                          </p>
                        </button>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {MEDIA_PRIORITIES.map((level) => {
                            const levelTheme = MEDIA_PRIORITY_THEME[level];
                            const isActive = movie.priority === level;

                            return (
                              <button
                                key={level}
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handlePriorityChange(movie.id, level)
                                }
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-medium transition-all",
                                  isActive
                                    ? cn(levelTheme.chip, "ring-1", levelTheme.ring)
                                    : "text-muted-foreground hover:bg-muted/80",
                                )}
                              >
                                {MEDIA_PRIORITY_LABELS[level]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      aria-label={`Remove ${movie.title}`}
                      onClick={() => setMovieToDelete(movie)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <AddMovieDialog open={addOpen} onOpenChange={setAddOpen} />

      <MovieDetailDialog
        movie={detailMovie}
        open={detailMovie !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailMovie(null);
          }
        }}
      />

      <Dialog
        open={randomPick !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRandomPick(null);
          }
        }}
      >
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-sm">
          <DialogHeader className="border-b px-4 py-4 text-center">
            <DialogTitle>Tonight&apos;s pick</DialogTitle>
            <DialogDescription>
              A random unwatched {MEDIA_TYPE_LABELS[filterType].toLowerCase()} from your list
            </DialogDescription>
          </DialogHeader>

          {randomPick && (
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <MediaPoster
                title={randomPick.title}
                posterUrl={randomPick.posterUrl}
                size="md"
                className="h-24 w-16"
              />
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {randomPick.title}
                </h2>
                <Badge className={cn("font-medium", MEDIA_PRIORITY_THEME[randomPick.priority].chip)}>
                  {MEDIA_PRIORITY_LABELS[randomPick.priority]} priority
                </Badge>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t bg-muted/50 px-4 py-4">
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRandomPick(null)}
              >
                Close
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={unwatchedMovies.length <= 1}
                onClick={handlePickAgain}
              >
                <Shuffle className="size-4" />
                Pick again
              </Button>
              {randomPick && !randomPick.completed && (
                <Button
                  type="button"
                  onClick={() => {
                    handleToggle(randomPick.id, true);
                    setRandomPick(null);
                  }}
                  disabled={isPending}
                >
                  Mark as watched
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={movieToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMovieToDelete(null);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>Remove from watchlist?</DialogTitle>
            <DialogDescription>
              {movieToDelete && (
                <>
                  <span className="font-medium text-foreground">
                    {movieToDelete.title}
                  </span>{" "}
                  will be permanently removed from your list.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-4 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setMovieToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmDelete}
            >
              {isPending ? "Removing..." : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
