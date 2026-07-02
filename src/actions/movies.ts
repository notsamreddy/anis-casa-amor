"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { movies, type MediaPriority, type MediaType } from "@/db/schema";

export type MovieInput = {
  title: string;
  mediaType: MediaType;
  priority: MediaPriority;
  posterUrl?: string | null;
  tmdbId?: number | null;
};

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function createMovie(input: MovieInput) {
  const userId = await requireUserId();

  const title = input.title.trim();
  if (!title) {
    throw new Error("Title is required");
  }

  const [movie] = await getDb()
    .insert(movies)
    .values({
      userId,
      title,
      mediaType: input.mediaType,
      priority: input.priority,
      posterUrl: input.posterUrl ?? null,
      tmdbId: input.tmdbId ?? null,
    })
    .returning();

  revalidatePath("/movies");

  return movie;
}

export async function toggleMovieCompletion(id: number, completed: boolean) {
  await requireUserId();

  await getDb()
    .update(movies)
    .set({ completed })
    .where(eq(movies.id, id));

  revalidatePath("/movies");
}

export async function deleteMovie(id: number) {
  await requireUserId();

  await getDb()
    .delete(movies)
    .where(eq(movies.id, id));

  revalidatePath("/movies");
}

export async function updateMoviePriority(id: number, priority: MediaPriority) {
  await requireUserId();

  await getDb()
    .update(movies)
    .set({ priority })
    .where(eq(movies.id, id));

  revalidatePath("/movies");
}
