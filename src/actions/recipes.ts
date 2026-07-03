"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { recipeVideos } from "@/db/schema";
import { generateRecipeFromVideo } from "@/lib/recipe-generation";
import { isRecipeRating } from "@/lib/recipe-types";
import {
  extractYouTubeVideoId,
  fetchYouTubeTitle,
} from "@/lib/youtube";

export type RecipeInput = {
  title: string;
  videoUrl: string;
  notes?: string | null;
};

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function lookupRecipeVideo(url: string): Promise<
  | { ok: true; title: string | null }
  | { ok: false; message: string }
> {
  await requireUserId();

  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, message: "Paste a YouTube link first" };
  }

  if (!extractYouTubeVideoId(trimmed)) {
    return { ok: false, message: "That doesn't look like a YouTube link" };
  }

  const title = await fetchYouTubeTitle(trimmed);
  return { ok: true, title };
}

export async function createRecipeVideo(input: RecipeInput) {
  const userId = await requireUserId();

  const videoUrl = input.videoUrl.trim();
  if (!extractYouTubeVideoId(videoUrl)) {
    throw new Error("A valid YouTube link is required");
  }

  let title = input.title.trim();
  if (!title) {
    title = (await fetchYouTubeTitle(videoUrl)) ?? "Untitled recipe";
  }

  const notes = input.notes?.trim() || null;

  const [recipe] = await getDb()
    .insert(recipeVideos)
    .values({
      userId,
      title,
      videoUrl,
      notes,
    })
    .returning();

  revalidatePath("/recipes");

  return recipe;
}

export async function toggleRecipeMade(id: number, made: boolean) {
  await requireUserId();

  await getDb()
    .update(recipeVideos)
    .set(made ? { made: true } : { made: false, rating: null })
    .where(eq(recipeVideos.id, id));

  revalidatePath("/recipes");
}

export async function updateRecipeRating(
  id: number,
  rating: number | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  await requireUserId();

  if (rating !== null && !isRecipeRating(rating)) {
    return { ok: false, message: "Rating must be between 1 and 5" };
  }

  const [recipe] = await getDb()
    .select({ made: recipeVideos.made })
    .from(recipeVideos)
    .where(eq(recipeVideos.id, id))
    .limit(1);

  if (!recipe) {
    return { ok: false, message: "Recipe not found" };
  }

  if (!recipe.made) {
    return { ok: false, message: "Mark this recipe as made before rating it" };
  }

  await getDb()
    .update(recipeVideos)
    .set({ rating })
    .where(eq(recipeVideos.id, id));

  revalidatePath("/recipes");

  return { ok: true };
}

export async function generateRecipeText(
  id: number,
  options?: { regenerate?: boolean },
): Promise<
  | { ok: true; recipeText: string }
  | { ok: false; message: string }
> {
  await requireUserId();

  const [recipe] = await getDb()
    .select()
    .from(recipeVideos)
    .where(eq(recipeVideos.id, id))
    .limit(1);

  if (!recipe) {
    return { ok: false, message: "Recipe not found" };
  }

  if (recipe.recipeText && !options?.regenerate) {
    return { ok: true, recipeText: recipe.recipeText };
  }

  try {
    const recipeText = await generateRecipeFromVideo(
      recipe.videoUrl,
      recipe.title,
    );

    await getDb()
      .update(recipeVideos)
      .set({ recipeText })
      .where(eq(recipeVideos.id, id));

    revalidatePath("/recipes");

    return { ok: true, recipeText };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not generate a recipe from this video",
    };
  }
}

export async function deleteRecipeVideo(id: number) {
  await requireUserId();

  await getDb().delete(recipeVideos).where(eq(recipeVideos.id, id));

  revalidatePath("/recipes");
}
