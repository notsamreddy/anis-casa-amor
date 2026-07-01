import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import {
  appSettings,
  exerciseCompletions,
  exercises,
  movies,
  workoutPlans,
  type Exercise,
  type Movie,
  type WorkoutPlan,
  type WorkoutType,
} from "@/db/schema";
import {
  SETTING_KEYS,
  parseBooleanSetting,
} from "@/lib/settings";
import { sortWatchlistItems } from "@/lib/media-types";
import { getTodayDateString } from "@/lib/workout-types";

export async function getWorkoutPlans(): Promise<WorkoutPlan[]> {
  return getDb().select().from(workoutPlans).orderBy(asc(workoutPlans.id));
}

export async function getWorkoutPlanByType(
  type: WorkoutType,
): Promise<WorkoutPlan | undefined> {
  const [plan] = await getDb()
    .select()
    .from(workoutPlans)
    .where(eq(workoutPlans.type, type))
    .limit(1);

  return plan;
}

export async function getExercisesByPlanId(planId: number): Promise<Exercise[]> {
  return getDb()
    .select()
    .from(exercises)
    .where(eq(exercises.planId, planId))
    .orderBy(asc(exercises.sortOrder), asc(exercises.id));
}

export async function getExercisesByType(type: WorkoutType): Promise<Exercise[]> {
  const plan = await getWorkoutPlanByType(type);
  if (!plan) {
    return [];
  }

  return getExercisesByPlanId(plan.id);
}

export async function getCompletedExerciseIds(
  userId: string,
  exerciseIds: number[],
  date = getTodayDateString(),
): Promise<Set<number>> {
  if (exerciseIds.length === 0) {
    return new Set();
  }

  const rows = await getDb()
    .select({ exerciseId: exerciseCompletions.exerciseId })
    .from(exerciseCompletions)
    .where(
      and(
        eq(exerciseCompletions.userId, userId),
        eq(exerciseCompletions.completedDate, date),
        inArray(exerciseCompletions.exerciseId, exerciseIds),
      ),
    );

  return new Set(rows.map((row) => row.exerciseId));
}

export async function getAllExercisesGroupedByPlan() {
  const plans = await getWorkoutPlans();
  const allExercises = await getDb()
    .select()
    .from(exercises)
    .orderBy(asc(exercises.sortOrder), asc(exercises.id));

  return plans.map((plan) => ({
    plan,
    exercises: allExercises.filter((exercise) => exercise.planId === plan.id),
  }));
}

export async function getExerciseSoundEnabled(): Promise<boolean> {
  const [row] = await getDb()
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, SETTING_KEYS.EXERCISE_SOUND_ENABLED))
    .limit(1);

  return parseBooleanSetting(row?.value, false);
}

export async function setExerciseSoundEnabled(enabled: boolean): Promise<void> {
  const value = enabled ? "true" : "false";

  await getDb()
    .insert(appSettings)
    .values({ key: SETTING_KEYS.EXERCISE_SOUND_ENABLED, value })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value },
    });
}

export async function getMoviesByUserId(userId: string): Promise<Movie[]> {
  const rows = await getDb()
    .select()
    .from(movies)
    .where(eq(movies.userId, userId));

  return sortWatchlistItems(rows);
}
