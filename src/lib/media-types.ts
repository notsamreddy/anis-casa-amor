import type { MediaPriority, MediaType } from "@/db/schema";

export const MEDIA_TYPES: MediaType[] = ["movie", "series"];

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  movie: "Movie",
  series: "Series",
};

export const MEDIA_PRIORITIES: MediaPriority[] = ["high", "medium", "low"];

export const MEDIA_PRIORITY_LABELS: Record<MediaPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

type MediaTheme = {
  accent: string;
  chip: string;
  tint: string;
  ring: string;
};

export const MEDIA_PRIORITY_THEME: Record<MediaPriority, MediaTheme> = {
  high: {
    accent: "bg-rose-500",
    chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    tint: "bg-rose-500/5",
    ring: "ring-rose-500/40",
  },
  medium: {
    accent: "bg-amber-500",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    tint: "bg-amber-500/5",
    ring: "ring-amber-500/40",
  },
  low: {
    accent: "bg-sky-500",
    chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    tint: "bg-sky-500/5",
    ring: "ring-sky-500/40",
  },
};

const PRIORITY_ORDER: Record<MediaPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export function sortWatchlistItems<T extends {
  completed: boolean;
  priority: MediaPriority;
  sortOrder: number;
  id: number;
}>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }

    // Legacy tiebreaker for items that share the default sortOrder.
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return a.id - b.id;
  });
}
