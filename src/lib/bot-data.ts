import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDb } from "@/db";
import {
  appSettings,
  exerciseCompletions,
  movies,
  recipeVideos,
  scheduleEvents,
  type MediaPriority,
  type MediaType,
  type WorkoutType,
} from "@/db/schema";
import {
  getAllMovies,
  getAllRecipeVideos,
  getCompletedExerciseIds,
  getExercisesByType,
  getScheduleEventsForWeek,
  getWorkoutPlanByType,
} from "@/lib/queries";
import {
  addDays,
  formatEventTimeRange,
  formatShortDate,
  getDayLabel,
  getWeekMonday,
} from "@/lib/schedule-types";
import { searchTmdb, getTmdbDetails } from "@/lib/tmdb";
import { getTodayDateString, isWorkoutType } from "@/lib/workout-types";
import {
  extractYouTubeVideoId,
  fetchYouTubeTitle,
} from "@/lib/youtube";

export function pickRandom<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

export async function getGymWorkout(type: string, userId: string) {
  if (!isWorkoutType(type)) {
    throw new Error("Invalid workout type. Use push, pull, or legs.");
  }

  const plan = await getWorkoutPlanByType(type);
  if (!plan) {
    throw new Error(`No ${type} workout plan found.`);
  }

  const exerciseList = await getExercisesByType(type);
  const completedIds = await getCompletedExerciseIds(
    userId,
    exerciseList.map((exercise) => exercise.id),
  );

  const date = getTodayDateString();
  const completedCount = exerciseList.filter((exercise) =>
    completedIds.has(exercise.id),
  ).length;

  return {
    type: type as WorkoutType,
    planName: plan.name,
    date,
    completedCount,
    total: exerciseList.length,
    exercises: exerciseList.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      notes: exercise.notes,
      videoUrl: exercise.videoUrl,
      completed: completedIds.has(exercise.id),
    })),
  };
}

export async function toggleGymExercise(
  userId: string,
  exerciseId: number,
  completed: boolean,
) {
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

export async function listWatchlist(mediaType?: MediaType) {
  const all = await getAllMovies();
  return mediaType
    ? all.filter((movie) => movie.mediaType === mediaType)
    : all;
}

export async function pickWatchlistItem(
  mediaType?: MediaType,
  priority?: MediaPriority,
) {
  let pool = (await listWatchlist(mediaType)).filter(
    (movie) => !movie.completed,
  );
  if (priority) {
    pool = pool.filter((movie) => movie.priority === priority);
  }
  return pickRandom(pool);
}

export async function searchWatchlist(query: string, mediaType: MediaType) {
  return searchTmdb(query, mediaType);
}

export async function addWatchlistItem(input: {
  userId: string;
  title: string;
  mediaType: MediaType;
  priority: MediaPriority;
  posterUrl?: string | null;
  tmdbId?: number | null;
}) {
  const title = input.title.trim();
  if (!title) {
    throw new Error("Title is required");
  }

  const [movie] = await getDb()
    .insert(movies)
    .values({
      userId: input.userId,
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

export async function addWatchlistFromTmdb(input: {
  userId: string;
  tmdbId: number;
  mediaType: MediaType;
  priority: MediaPriority;
}) {
  const details = await getTmdbDetails(input.tmdbId, input.mediaType);
  return addWatchlistItem({
    userId: input.userId,
    title: details.title,
    mediaType: input.mediaType,
    priority: input.priority,
    posterUrl: details.posterUrl,
    tmdbId: input.tmdbId,
  });
}

export async function setWatchlistPriority(
  id: number,
  priority: MediaPriority,
) {
  const [updated] = await getDb()
    .update(movies)
    .set({ priority })
    .where(eq(movies.id, id))
    .returning();

  if (!updated) {
    throw new Error("Watchlist item not found");
  }

  revalidatePath("/movies");
  return updated;
}

export async function setWatchlistCompleted(id: number, completed: boolean) {
  const [updated] = await getDb()
    .update(movies)
    .set({ completed })
    .where(eq(movies.id, id))
    .returning();

  if (!updated) {
    throw new Error("Watchlist item not found");
  }

  revalidatePath("/movies");
  return updated;
}

export async function listRecipes() {
  return getAllRecipeVideos();
}

export async function pickRecipe() {
  const all = await getAllRecipeVideos();
  const unmade = all.filter((recipe) => !recipe.made);
  return pickRandom(unmade.length > 0 ? unmade : all);
}

export async function addRecipe(input: {
  userId: string;
  videoUrl: string;
  title?: string | null;
  notes?: string | null;
}) {
  const videoUrl = input.videoUrl.trim();
  if (!extractYouTubeVideoId(videoUrl)) {
    throw new Error("Paste a valid YouTube link.");
  }

  let title = input.title?.trim() ?? "";
  if (!title) {
    title = (await fetchYouTubeTitle(videoUrl)) ?? "Untitled recipe";
  }

  const notes = input.notes?.trim() || null;

  const [recipe] = await getDb()
    .insert(recipeVideos)
    .values({
      userId: input.userId,
      title,
      videoUrl,
      notes,
    })
    .returning();

  revalidatePath("/recipes");
  return recipe;
}

export async function setRecipeMade(id: number, made: boolean) {
  const [updated] = await getDb()
    .update(recipeVideos)
    .set(made ? { made: true } : { made: false, rating: null })
    .where(eq(recipeVideos.id, id))
    .returning();

  if (!updated) {
    throw new Error("Recipe not found");
  }

  revalidatePath("/recipes");
  return updated;
}

export async function getDaySchedule(dayOffset: number) {
  const date = addDays(getTodayDateString(), dayOffset);
  const events = await getScheduleEventsForWeek(date, date);

  return {
    date,
    label: getDayLabel(date),
    shortDate: formatShortDate(date),
    events: events.map((event) => ({
      id: event.id,
      type: event.type,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      allDay: event.allDay,
      hasConflict: event.hasConflict,
    })),
  };
}

export async function getWeekSchedule(weekOffset = 0) {
  const monday = addDays(getWeekMonday(), weekOffset * 7);
  const sunday = addDays(monday, 6);
  const events = await getScheduleEventsForWeek(monday, sunday);

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    const dayEvents = events.filter((event) => event.eventDate === date);
    return {
      date,
      label: getDayLabel(date),
      shortDate: formatShortDate(date),
      events: dayEvents.map((event) => ({
        id: event.id,
        type: event.type,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        allDay: event.allDay,
        hasConflict: event.hasConflict,
      })),
    };
  });

  return { weekStart: monday, weekEnd: sunday, days };
}

function reminderKey(eventId: number, eventDate: string) {
  return `schedule_reminder:${eventId}:${eventDate}`;
}

async function wasReminderSent(eventId: number, eventDate: string) {
  const [row] = await getDb()
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, reminderKey(eventId, eventDate)))
    .limit(1);
  return Boolean(row);
}

async function markReminderSent(eventId: number, eventDate: string) {
  await getDb()
    .insert(appSettings)
    .values({ key: reminderKey(eventId, eventDate), value: "sent" })
    .onConflictDoNothing();
}

function parseShiftStart(eventDate: string, startTime: string): Date | null {
  const [hourPart, minutePart] = startTime.split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart ?? "0");
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  const start = new Date(`${eventDate}T12:00:00`);
  start.setHours(hour, minute, 0, 0);
  return start;
}

export async function getUpcomingShiftReminders(
  withinMinutes = 60,
  windowMinutes = 10,
) {
  const today = getTodayDateString();
  const events = await getScheduleEventsForWeek(today, today);
  const now = Date.now();
  const minMs = (withinMinutes - windowMinutes / 2) * 60_000;
  const maxMs = (withinMinutes + windowMinutes / 2) * 60_000;

  const upcoming = [];

  for (const event of events) {
    if (event.type !== "shift" || event.allDay || !event.startTime) {
      continue;
    }

    const start = parseShiftStart(event.eventDate, event.startTime);
    if (!start) {
      continue;
    }

    const diff = start.getTime() - now;
    if (diff < minMs || diff > maxMs) {
      continue;
    }

    if (await wasReminderSent(event.id, event.eventDate)) {
      continue;
    }

    upcoming.push({
      id: event.id,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      timeLabel: formatEventTimeRange(
        event.startTime,
        event.endTime,
        event.allDay,
      ),
    });
  }

  return upcoming;
}

export async function markShiftRemindersSent(
  reminders: Array<{ id: number; eventDate: string }>,
) {
  for (const reminder of reminders) {
    await markReminderSent(reminder.id, reminder.eventDate);
  }
}
