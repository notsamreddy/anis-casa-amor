import type { WorkoutType } from "@/db/schema";

export const WORKOUT_TYPES: WorkoutType[] = ["push", "pull", "legs"];

export const WORKOUT_LABELS: Record<WorkoutType, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

export const WORKOUT_DESCRIPTIONS: Record<WorkoutType, string> = {
  push: "Chest, shoulders, and triceps",
  pull: "Back and biceps",
  legs: "Quads, hamstrings, glutes, and calves",
};

type WorkoutTheme = {
  accent: string;
  chip: string;
  tint: string;
};

export const WORKOUT_THEME: Record<WorkoutType, WorkoutTheme> = {
  push: {
    accent: "bg-orange-500",
    chip: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    tint: "bg-orange-500/5",
  },
  pull: {
    accent: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    tint: "bg-sky-500/5",
  },
  legs: {
    accent: "bg-emerald-500",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    tint: "bg-emerald-500/5",
  },
};

export function isWorkoutType(value: string): value is WorkoutType {
  return WORKOUT_TYPES.includes(value as WorkoutType);
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}
