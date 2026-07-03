export const RECIPE_RATINGS = [1, 2, 3, 4, 5] as const;

export type RecipeRating = (typeof RECIPE_RATINGS)[number];

export function isRecipeRating(value: number): value is RecipeRating {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export function recipeRatingLabel(rating: RecipeRating): string {
  const labels: Record<RecipeRating, string> = {
    1: "Not for me",
    2: "Okay",
    3: "Good",
    4: "Really liked it",
    5: "Love it",
  };
  return labels[rating];
}
