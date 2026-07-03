"use client";

import Image from "next/image";
import { useMemo, useState, useTransition } from "react";
import {
  BookOpen,
  ChefHat,
  Play,
  Plus,
  Shuffle,
  Trash2,
} from "lucide-react";

import { AddRecipeDialog } from "@/components/add-recipe-dialog";
import { RecipeDetailDialog } from "@/components/recipe-detail-dialog";
import {
  deleteRecipeVideo,
  toggleRecipeMade,
  updateRecipeRating,
} from "@/actions/recipes";
import type { RecipeVideo } from "@/db/schema";
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
import { RecipeRatingPicker } from "@/components/recipe-rating";
import type { RecipeRating } from "@/lib/recipe-types";
import {
  extractYouTubeVideoId,
  getYouTubeEmbed,
  getYouTubeThumbnailUrl,
} from "@/lib/youtube";
import { cn } from "@/lib/utils";

type RecipeListProps = {
  recipes: RecipeVideo[];
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

function RecipeThumbnail({
  title,
  videoUrl,
  className,
}: {
  title: string;
  videoUrl: string;
  className?: string;
}) {
  const videoId = extractYouTubeVideoId(videoUrl);

  if (!videoId) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-muted",
          className,
        )}
      >
        <ChefHat className="size-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-lg", className)}>
      <Image
        src={getYouTubeThumbnailUrl(videoId)}
        alt={title}
        fill
        className="object-cover"
        sizes="80px"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <Play className="size-5 fill-white text-white" />
      </div>
    </div>
  );
}

function RecipeVideoPlayer({
  recipe,
  open,
  onOpenChange,
}: {
  recipe: RecipeVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const embed = recipe ? getYouTubeEmbed(recipe.videoUrl) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("p-3", embed?.isShort ? "max-w-xs" : "max-w-xl")}
      >
        {recipe && (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8 text-sm">{recipe.title}</DialogTitle>
            </DialogHeader>
            {embed ? (
              <div
                className={cn(
                  "relative overflow-hidden rounded-lg bg-black",
                  embed.isShort
                    ? "mx-auto aspect-[9/16] w-full max-w-[17rem]"
                    : "aspect-video w-full",
                )}
              >
                {open && (
                  <iframe
                    src={embed.embedUrl}
                    title={recipe.title}
                    loading="lazy"
                    className="absolute inset-0 size-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
            ) : (
              <a
                href={recipe.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary"
              >
                Open on YouTube
              </a>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RecipeList({ recipes }: RecipeListProps) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<RecipeVideo | null>(null);
  const [randomPick, setRandomPick] = useState<RecipeVideo | null>(null);
  const [watchRecipe, setWatchRecipe] = useState<RecipeVideo | null>(null);
  const [detailRecipe, setDetailRecipe] = useState<RecipeVideo | null>(null);

  const unmadeRecipes = useMemo(
    () => recipes.filter((recipe) => !recipe.made),
    [recipes],
  );

  const madeCount = recipes.filter((recipe) => recipe.made).length;
  const total = recipes.length;
  const percent = total > 0 ? Math.round((madeCount / total) * 100) : 0;
  const randomPool = unmadeRecipes.length > 0 ? unmadeRecipes : recipes;
  const activeDetailRecipe = detailRecipe
    ? recipes.find((recipe) => recipe.id === detailRecipe.id) ?? detailRecipe
    : null;

  function handleToggleMade(id: number, checked: boolean) {
    startTransition(async () => {
      await toggleRecipeMade(id, checked);
    });
  }

  function handleRatingChange(id: number, rating: RecipeRating | null) {
    startTransition(async () => {
      await updateRecipeRating(id, rating);
    });
  }

  function handlePickRandom() {
    const pick = pickRandomExcluding(randomPool);
    if (pick) {
      setRandomPick(pick);
    }
  }

  function handlePickAgain() {
    const pick = pickRandomExcluding(randomPool, randomPick?.id);
    if (pick) {
      setRandomPick(pick);
    }
  }

  function handleConfirmDelete() {
    if (!recipeToDelete) {
      return;
    }

    startTransition(async () => {
      await deleteRecipeVideo(recipeToDelete.id);
      setRecipeToDelete(null);
      if (randomPick?.id === recipeToDelete.id) {
        setRandomPick(null);
      }
      if (detailRecipe?.id === recipeToDelete.id) {
        setDetailRecipe(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white">
            <ChefHat className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recipes</h1>
            <p className="text-muted-foreground">
              YouTube Shorts saved for when you can&apos;t decide
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={recipes.length === 0}
            onClick={handlePickRandom}
          >
            <Shuffle className="size-4" />
            Pick random
          </Button>
          <Button
            type="button"
            className="w-full bg-amber-600 hover:bg-amber-600/90 sm:w-auto"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="size-4" />
            Add recipe
          </Button>
        </div>
      </section>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No recipes saved yet. Tap Add recipe and paste a YouTube Shorts link.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {madeCount} of {total} made
              </span>
              <span className="tabular-nums text-muted-foreground">
                {isPending ? "Saving…" : `${percent}%`}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-600 transition-all duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            {recipes.map((recipe) => {
              const isRandomHighlight = randomPick?.id === recipe.id;

              return (
                <Card
                  key={recipe.id}
                  className={cn(
                    "relative overflow-hidden py-0 transition-colors",
                    recipe.made && "bg-amber-500/5",
                    isRandomHighlight && "ring-2 ring-amber-500/50",
                  )}
                >
                  <div className="absolute inset-y-0 left-0 w-1 bg-amber-600" />
                  <CardContent className="flex items-start gap-3.5 p-4 pl-5">
                    <Checkbox
                      id={`recipe-made-${recipe.id}`}
                      checked={recipe.made}
                      disabled={isPending}
                      className="mt-0.5 size-7 shrink-0 sm:mt-1 sm:size-6"
                      onCheckedChange={(checked) =>
                        handleToggleMade(recipe.id, checked === true)
                      }
                    />

                    <button
                      type="button"
                      onClick={() => setDetailRecipe(recipe)}
                      className="shrink-0 hover:opacity-90"
                    >
                      <RecipeThumbnail
                        title={recipe.title}
                        videoUrl={recipe.videoUrl}
                        className="size-16 sm:size-14"
                      />
                    </button>

                    <div className="min-w-0 flex-1 space-y-2">
                      <button
                        type="button"
                        onClick={() => setDetailRecipe(recipe)}
                        className="w-full text-left hover:opacity-90"
                      >
                        <p
                          className={cn(
                            "text-base font-semibold tracking-tight transition-colors",
                            recipe.made && "text-muted-foreground line-through",
                          )}
                        >
                          {recipe.title}
                        </p>
                      </button>

                      {recipe.notes && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {recipe.notes}
                        </p>
                      )}

                      {recipe.made && (
                        <RecipeRatingPicker
                          value={recipe.rating}
                          onChange={(rating) =>
                            handleRatingChange(recipe.id, rating)
                          }
                          disabled={isPending}
                          size="sm"
                        />
                      )}

                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 px-2 text-amber-600 hover:text-amber-600"
                          onClick={() => setWatchRecipe(recipe)}
                        >
                          <Play className="size-3.5 fill-current" />
                          Watch
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => setDetailRecipe(recipe)}
                        >
                          <BookOpen className="size-3.5" />
                          {recipe.recipeText ? "View recipe" : "Generate recipe"}
                        </Button>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={isPending}
                      aria-label={`Remove ${recipe.title}`}
                      onClick={() => setRecipeToDelete(recipe)}
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

      <AddRecipeDialog open={addOpen} onOpenChange={setAddOpen} />

      <RecipeDetailDialog
        recipe={activeDetailRecipe}
        open={detailRecipe !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailRecipe(null);
          }
        }}
        onWatchVideo={setWatchRecipe}
      />

      <RecipeVideoPlayer
        recipe={watchRecipe}
        open={watchRecipe !== null}
        onOpenChange={(open) => {
          if (!open) {
            setWatchRecipe(null);
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
            <DialogTitle>What&apos;s for dinner?</DialogTitle>
            <DialogDescription>
              {unmadeRecipes.length > 0
                ? "A random recipe you haven't made yet"
                : "A random recipe from your collection"}
            </DialogDescription>
          </DialogHeader>

          {randomPick && (
            <div className="flex flex-col items-center gap-4 p-6 text-center">
              <RecipeThumbnail
                title={randomPick.title}
                videoUrl={randomPick.videoUrl}
                className="size-28"
              />
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">
                  {randomPick.title}
                </h2>
                {randomPick.notes && (
                  <p className="text-sm text-muted-foreground">
                    {randomPick.notes}
                  </p>
                )}
                {randomPick.recipeText && (
                  <p className="text-xs text-amber-600">
                    Written recipe available
                  </p>
                )}
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
                disabled={randomPool.length <= 1}
                onClick={handlePickAgain}
              >
                <Shuffle className="size-4" />
                Pick again
              </Button>
              {randomPick?.recipeText && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDetailRecipe(randomPick);
                    setRandomPick(null);
                  }}
                >
                  <BookOpen className="size-4" />
                  Read recipe
                </Button>
              )}
              {randomPick && (
                <Button
                  type="button"
                  className="bg-amber-600 hover:bg-amber-600/90"
                  onClick={() => {
                    setWatchRecipe(randomPick);
                    setRandomPick(null);
                  }}
                >
                  <Play className="size-4 fill-current" />
                  Watch recipe
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={recipeToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRecipeToDelete(null);
          }
        }}
      >
        <DialogContent showCloseButton={false} className="gap-0 overflow-hidden p-0 sm:max-w-sm">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>Remove recipe?</DialogTitle>
            <DialogDescription>
              {recipeToDelete && (
                <>
                  <span className="font-medium text-foreground">
                    {recipeToDelete.title}
                  </span>{" "}
                  will be permanently removed from your collection.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 border-t bg-muted/50 px-4 py-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setRecipeToDelete(null)}
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
