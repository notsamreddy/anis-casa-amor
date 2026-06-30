"use server";

import { revalidatePath } from "next/cache";
import { eq, max } from "drizzle-orm";

import { getDb } from "@/db";
import { exercises } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";

export type ExerciseInput = {
  planId: number;
  name: string;
  sets: number;
  reps: string;
  notes?: string;
  videoUrl?: string;
};

async function getNextSortOrder(planId: number): Promise<number> {
  const [result] = await getDb()
    .select({ maxOrder: max(exercises.sortOrder) })
    .from(exercises)
    .where(eq(exercises.planId, planId));

  return (result?.maxOrder ?? -1) + 1;
}

export async function createExercise(input: ExerciseInput) {
  await requireAdmin();

  const [exercise] = await getDb()
    .insert(exercises)
    .values({
      planId: input.planId,
      name: input.name.trim(),
      sets: input.sets,
      reps: input.reps.trim(),
      notes: input.notes?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
      sortOrder: await getNextSortOrder(input.planId),
    })
    .returning();

  revalidatePath("/admin");
  revalidatePath("/gym");

  return exercise;
}

export async function updateExercise(
  id: number,
  input: ExerciseInput,
) {
  await requireAdmin();

  const [exercise] = await getDb()
    .update(exercises)
    .set({
      planId: input.planId,
      name: input.name.trim(),
      sets: input.sets,
      reps: input.reps.trim(),
      notes: input.notes?.trim() || null,
      videoUrl: input.videoUrl?.trim() || null,
    })
    .where(eq(exercises.id, id))
    .returning();

  revalidatePath("/admin");
  revalidatePath("/gym");

  return exercise;
}

export async function deleteExercise(id: number) {
  await requireAdmin();

  await getDb().delete(exercises).where(eq(exercises.id, id));

  revalidatePath("/admin");
  revalidatePath("/gym");
}

export async function moveExercise(id: number, direction: "up" | "down") {
  await requireAdmin();

  const [current] = await getDb()
    .select()
    .from(exercises)
    .where(eq(exercises.id, id))
    .limit(1);

  if (!current) {
    throw new Error("Exercise not found");
  }

  const siblings = await getDb()
    .select()
    .from(exercises)
    .where(eq(exercises.planId, current.planId));

  const sorted = siblings.sort((a, b) => a.sortOrder - b.sortOrder);
  const index = sorted.findIndex((item) => item.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;

  if (swapIndex < 0 || swapIndex >= sorted.length) {
    return;
  }

  const swapWith = sorted[swapIndex];

  await getDb().transaction(async (tx) => {
    await tx
      .update(exercises)
      .set({ sortOrder: swapWith.sortOrder })
      .where(eq(exercises.id, current.id));

    await tx
      .update(exercises)
      .set({ sortOrder: current.sortOrder })
      .where(eq(exercises.id, swapWith.id));
  });

  revalidatePath("/admin");
  revalidatePath("/gym");
}
