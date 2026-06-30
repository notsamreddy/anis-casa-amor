"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { exerciseCompletions } from "@/db/schema";
import { getTodayDateString } from "@/lib/workout-types";

export async function toggleExerciseCompletion(
  exerciseId: number,
  completed: boolean,
) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const completedDate = getTodayDateString();

  if (completed) {
    await getDb()
      .insert(exerciseCompletions)
      .values({ userId, exerciseId, completedDate })
      .onConflictDoNothing();
  } else {
    await getDb()
      .delete(exerciseCompletions)
      .where(
        and(
          eq(exerciseCompletions.userId, userId),
          eq(exerciseCompletions.exerciseId, exerciseId),
          eq(exerciseCompletions.completedDate, completedDate),
        ),
      );
  }

  revalidatePath("/gym");
}
