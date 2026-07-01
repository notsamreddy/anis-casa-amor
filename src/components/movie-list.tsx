"use client";

import { useMemo, useState, useTransition } from "react";
import { Film, Plus, Trash2, Tv } from "lucide-react";

import { createMovie, deleteMovie, toggleMovieCompletion } from "@/actions/movies";
import type { MediaPriority, MediaType, Movie } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  sortWatchlistItems,
} from "@/lib/media-types";
import { cn } from "@/lib/utils";

type MovieListProps = {
  movies: Movie[];
};

export function MovieList({ movies }: MovieListProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("movie");
  const [priority, setPriority] = useState<MediaPriority>("medium");
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);

  const sortedMovies = useMemo(() => sortWatchlistItems(movies), [movies]);
  const completedCount = sortedMovies.filter((movie) => movie.completed).length;
  const total = sortedMovies.length;
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    startTransition(async () => {
      await createMovie({
        title: trimmedTitle,
        mediaType,
        priority,
      });
      setTitle("");
      setMediaType("movie");
      setPriority("medium");
    });
  }

  function handleToggle(id: number, checked: boolean) {
    startTransition(async () => {
      await toggleMovieCompletion(id, checked);
    });
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
      <form onSubmit={handleAdd} className="space-y-4 rounded-xl border p-4">
        <div className="space-y-2">
          <Label htmlFor="movie-title">Title</Label>
          <Input
            id="movie-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Breaking Bad"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {MEDIA_TYPES.map((type) => {
              const selected = mediaType === type;
              const Icon = type === "movie" ? Film : Tv;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMediaType(type)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    selected
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
          <Label>Priority</Label>
          <div className="grid grid-cols-3 gap-2">
            {MEDIA_PRIORITIES.map((level) => {
              const theme = MEDIA_PRIORITY_THEME[level];
              const selected = priority === level;

              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setPriority(level)}
                  className={cn(
                    "rounded-lg border px-2 py-2.5 text-sm font-medium transition-all",
                    selected
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

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-600 hover:to-purple-700"
          disabled={isPending || !title.trim()}
        >
          <Plus className="size-4" />
          {isPending ? "Adding..." : "Add to list"}
        </Button>
      </form>

      {sortedMovies.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing on your list yet. Add a movie or series above.
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
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 transition-all duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {sortedMovies.map((movie) => {
              const theme = MEDIA_PRIORITY_THEME[movie.priority];
              const TypeIcon = movie.mediaType === "movie" ? Film : Tv;

              return (
                <Card
                  key={movie.id}
                  className={cn(
                    "relative overflow-hidden py-0 transition-colors",
                    movie.completed && theme.tint,
                  )}
                >
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 w-1 bg-gradient-to-b",
                      theme.gradient,
                    )}
                  />
                  <CardContent className="flex items-start gap-3.5 p-4 pl-5">
                    <Checkbox
                      id={`movie-${movie.id}`}
                      checked={movie.completed}
                      disabled={isPending}
                      className="mt-0.5 size-6"
                      onCheckedChange={(checked) =>
                        handleToggle(movie.id, checked === true)
                      }
                    />

                    <div className="min-w-0 flex-1 space-y-2">
                      <label
                        htmlFor={`movie-${movie.id}`}
                        className={cn(
                          "block cursor-pointer text-base font-semibold tracking-tight transition-colors",
                          movie.completed &&
                            "text-muted-foreground line-through",
                        )}
                      >
                        {movie.title}
                      </label>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="gap-1 font-medium">
                          <TypeIcon className="size-3" />
                          {MEDIA_TYPE_LABELS[movie.mediaType]}
                        </Badge>
                        <Badge className={cn("font-medium", theme.chip)}>
                          {MEDIA_PRIORITY_LABELS[movie.priority]}
                        </Badge>
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

      <Dialog
        open={movieToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMovieToDelete(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
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
          <DialogFooter>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
