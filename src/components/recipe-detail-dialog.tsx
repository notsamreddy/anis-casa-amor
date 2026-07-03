"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { ExternalLink, Loader2, Play, RefreshCw, Sparkles } from "lucide-react";

import {
  generateRecipeText,
  toggleRecipeMade,
  updateRecipeRating,
} from "@/actions/recipes";
import type { RecipeVideo } from "@/db/schema";
import { RecipeRatingPicker } from "@/components/recipe-rating";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { RecipeRating } from "@/lib/recipe-types";
import {
  extractYouTubeVideoId,
  getYouTubeEmbed,
  getYouTubeThumbnailUrl,
} from "@/lib/youtube";
import { cn } from "@/lib/utils";

type RecipeDetailDialogProps = {
  recipe: RecipeVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWatchVideo: (recipe: RecipeVideo) => void;
};

function RecipeTextView({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="max-h-[50vh] space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-4 text-sm">
      {lines.map((line, index) => {
        if (line.startsWith("# ")) {
          return (
            <h3 key={index} className="text-base font-semibold">
              {line.slice(2)}
            </h3>
          );
        }

        if (line.startsWith("## ")) {
          return (
            <h4 key={index} className="pt-1 font-semibold">
              {line.slice(3)}
            </h4>
          );
        }

        if (line.startsWith("- ")) {
          return (
            <p key={index} className="pl-3 text-muted-foreground">
              • {line.slice(2)}
            </p>
          );
        }

        const stepMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (stepMatch) {
          return (
            <p key={index} className="pl-1">
              <span className="font-medium text-amber-600">{stepMatch[1]}.</span>{" "}
              {stepMatch[2]}
            </p>
          );
        }

        if (line.startsWith("**Servings:**")) {
          return (
            <p key={index} className="text-muted-foreground">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }

        if (!line.trim()) {
          return <div key={index} className="h-1" />;
        }

        return (
          <p key={index} className="text-muted-foreground">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function RecipeDetailDialog({
  recipe,
  open,
  onOpenChange,
  onWatchVideo,
}: RecipeDetailDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [isGenerating, startGenerate] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [recipeText, setRecipeText] = useState<string | null>(null);

  useEffect(() => {
    if (open && recipe) {
      setRecipeText(recipe.recipeText);
      setError(null);
    }
  }, [open, recipe]);

  if (!recipe) {
    return null;
  }

  const videoId = extractYouTubeVideoId(recipe.videoUrl);
  const embed = getYouTubeEmbed(recipe.videoUrl);

  function handleToggleMade(checked: boolean) {
    startTransition(async () => {
      await toggleRecipeMade(recipe!.id, checked);
    });
  }

  function handleRatingChange(rating: RecipeRating | null) {
    startTransition(async () => {
      const result = await updateRecipeRating(recipe!.id, rating);
      if (!result.ok) {
        setError(result.message);
      }
    });
  }

  function handleGenerate(regenerate = false) {
    setError(null);

    startGenerate(async () => {
      const result = await generateRecipeText(recipe!.id, { regenerate });
      if (!result.ok) {
        setError(result.message);
        return;
      }

      setRecipeText(result.recipeText);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-4 py-4">
          <DialogTitle className="pr-8">{recipe.title}</DialogTitle>
          <DialogDescription>
            Mark when you&apos;ve made it, rate it, or read the written recipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-4 py-4">
          {videoId && (
            <div className="relative mx-auto aspect-video w-full max-w-xs overflow-hidden rounded-lg">
              <Image
                src={getYouTubeThumbnailUrl(videoId)}
                alt={recipe.title}
                fill
                className="object-cover"
                sizes="320px"
              />
            </div>
          )}

          {recipe.notes && (
            <p className="text-sm text-muted-foreground">{recipe.notes}</p>
          )}

          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id={`recipe-made-${recipe.id}`}
                checked={recipe.made}
                disabled={isPending || isGenerating}
                className="size-6"
                onCheckedChange={(checked) => handleToggleMade(checked === true)}
              />
              <Label htmlFor={`recipe-made-${recipe.id}`} className="font-medium">
                Already made this
              </Label>
            </div>

            {recipe.made && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm font-medium">How was it?</p>
                <RecipeRatingPicker
                  value={recipe.rating}
                  onChange={handleRatingChange}
                  disabled={isPending || isGenerating}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Written recipe</p>
              {recipeText && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isGenerating}
                  onClick={() => handleGenerate(true)}
                >
                  <RefreshCw className={cn("size-3.5", isGenerating && "animate-spin")} />
                  Regenerate
                </Button>
              )}
            </div>

            {recipeText ? (
              <RecipeTextView text={recipeText} />
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Generate a readable recipe from the video so you don&apos;t have
                  to rewatch it.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  disabled={isGenerating}
                  onClick={() => handleGenerate(false)}
                >
                  {isGenerating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {isGenerating ? "Generating..." : "Generate recipe"}
                </Button>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t bg-muted/50 px-4 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              type="button"
              className="bg-amber-600 hover:bg-amber-600/90"
              onClick={() => {
                onWatchVideo(recipe);
                onOpenChange(false);
              }}
            >
              <Play className="size-4 fill-current" />
              Watch video
            </Button>
            {!embed && (
              <a
                href={recipe.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm font-medium hover:bg-muted"
              >
                Open on YouTube
                <ExternalLink className="size-4" />
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
