"use client";

import { Star } from "lucide-react";

import { RECIPE_RATINGS, recipeRatingLabel, type RecipeRating } from "@/lib/recipe-types";
import { cn } from "@/lib/utils";

type RecipeRatingPickerProps = {
  value: number | null;
  onChange: (rating: RecipeRating | null) => void;
  disabled?: boolean;
  size?: "sm" | "md";
};

export function RecipeRatingPicker({
  value,
  onChange,
  disabled = false,
  size = "md",
}: RecipeRatingPickerProps) {
  const iconSize = size === "sm" ? "size-4" : "size-5";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5">
        {RECIPE_RATINGS.map((rating) => {
          const active = value !== null && rating <= value;

          return (
            <button
              key={rating}
              type="button"
              disabled={disabled}
              aria-label={`Rate ${rating} out of 5`}
              onClick={() => onChange(value === rating ? null : rating)}
              className={cn(
                "rounded-md p-1 transition-colors disabled:opacity-50",
                !disabled && "hover:bg-muted/80",
              )}
            >
              <Star
                className={cn(
                  iconSize,
                  active
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground",
                )}
              />
            </button>
          );
        })}
      </div>
      {value !== null && (
        <p className="text-xs text-muted-foreground">
          {recipeRatingLabel(value as RecipeRating)}
        </p>
      )}
    </div>
  );
}
