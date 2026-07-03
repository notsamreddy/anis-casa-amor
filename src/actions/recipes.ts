"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { recipeVideos } from "@/db/schema";
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

export async function deleteRecipeVideo(id: number) {
  await requireUserId();

  await getDb().delete(recipeVideos).where(eq(recipeVideos.id, id));

  revalidatePath("/recipes");
}
