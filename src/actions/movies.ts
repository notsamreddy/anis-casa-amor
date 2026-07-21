"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { eq, inArray, max } from "drizzle-orm";

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

async function getNextSortOrder(mediaType: MediaType): Promise<number> {
  const [result] = await getDb()
    .select({ maxOrder: max(movies.sortOrder) })
    .from(movies)
    .where(eq(movies.mediaType, mediaType));

  return (result?.maxOrder ?? -1) + 1;
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
      sortOrder: await getNextSortOrder(input.mediaType),
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

export async function reorderMovies(orderedIds: number[]) {
  await requireUserId();

  if (orderedIds.length === 0) {
    return;
  }

  if (orderedIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("Invalid movie id");
  }

  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new Error("Duplicate movie ids");
  }

  const existing = await getDb()
    .select({ id: movies.id })
    .from(movies)
    .where(inArray(movies.id, orderedIds));

  if (existing.length !== orderedIds.length) {
    throw new Error("One or more movies were not found");
  }

  await getDb().transaction(async (tx) => {
    await Promise.all(
      orderedIds.map((id, index) =>
        tx
          .update(movies)
          .set({ sortOrder: index })
          .where(eq(movies.id, id)),
      ),
    );
  });

  revalidatePath("/movies");
}
