"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { movies, type MediaPriority, type MediaType } from "@/db/schema";

export type MovieInput = {
  title: string;
  mediaType: MediaType;
  priority: MediaPriority;
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
    })
    .returning();

  revalidatePath("/movies");

  return movie;
}

export async function toggleMovieCompletion(id: number, completed: boolean) {
  const userId = await requireUserId();

  await getDb()
    .update(movies)
    .set({ completed })
    .where(and(eq(movies.id, id), eq(movies.userId, userId)));

  revalidatePath("/movies");
}

export async function deleteMovie(id: number) {
  const userId = await requireUserId();

  await getDb()
    .delete(movies)
    .where(and(eq(movies.id, id), eq(movies.userId, userId)));

  revalidatePath("/movies");
}
