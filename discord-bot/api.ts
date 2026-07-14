import { botConfig } from "./config";

export class CasaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CasaApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${botConfig.apiUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${botConfig.botSecret}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
  } & T;

  if (!response.ok) {
    throw new CasaApiError(
      data.message ?? `API error (${response.status})`,
      response.status,
    );
  }

  return data;
}

export type GymExercise = {
  id: number;
  name: string;
  sets: number;
  reps: string;
  notes: string | null;
  videoUrl: string | null;
  completed: boolean;
};

export type GymWorkout = {
  type: string;
  planName: string;
  date: string;
  completedCount: number;
  total: number;
  exercises: GymExercise[];
};

export type WatchlistItem = {
  id: number;
  title: string;
  mediaType: string;
  priority: string;
  completed: boolean;
  posterUrl: string | null;
};

export type MediaSearchResult = {
  tmdbId: number;
  title: string;
  year: string | null;
  posterUrl: string | null;
  mediaType: string;
};

export type RecipeItem = {
  id: number;
  title: string;
  videoUrl: string;
  made: boolean;
  rating: number | null;
  notes: string | null;
};

export type ScheduleDay = {
  date: string;
  label: string;
  shortDate: string;
  events: Array<{
    id: number;
    type: string;
    startTime: string | null;
    endTime: string | null;
    location: string | null;
    allDay: boolean;
    hasConflict: boolean;
  }>;
};

export type ShiftReminder = {
  id: number;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  timeLabel: string;
};

export const casaApi = {
  getGym(type: string, discordUserId: string) {
    const params = new URLSearchParams({ type, discordUserId });
    return request<GymWorkout>(`/api/bot/gym?${params}`);
  },

  toggleGym(
    discordUserId: string,
    exerciseId: number,
    completed: boolean,
    type: string,
  ) {
    return request<GymWorkout>("/api/bot/gym", {
      method: "POST",
      body: JSON.stringify({ discordUserId, exerciseId, completed, type }),
    });
  },

  listWatchlist(mediaType?: string) {
    const params = new URLSearchParams();
    if (mediaType) {
      params.set("mediaType", mediaType);
    }
    const query = params.toString();
    return request<{ items: WatchlistItem[] }>(
      `/api/bot/watchlist${query ? `?${query}` : ""}`,
    );
  },

  searchWatchlist(query: string, mediaType: string) {
    const params = new URLSearchParams({ query, mediaType });
    return request<{ results: MediaSearchResult[] }>(
      `/api/bot/watchlist?${params}`,
    );
  },

  pickWatchlist(mediaType?: string, priority?: string) {
    return request<{ pick: WatchlistItem }>("/api/bot/watchlist", {
      method: "POST",
      body: JSON.stringify({ action: "random", mediaType, priority }),
    });
  },

  addWatchlist(
    discordUserId: string,
    title: string,
    mediaType: string,
    priority: string,
  ) {
    return request<{ item: WatchlistItem }>("/api/bot/watchlist", {
      method: "POST",
      body: JSON.stringify({
        action: "add",
        discordUserId,
        title,
        mediaType,
        priority,
      }),
    });
  },

  addWatchlistTmdb(
    discordUserId: string,
    tmdbId: number,
    mediaType: string,
    priority = "medium",
  ) {
    return request<{ item: WatchlistItem }>("/api/bot/watchlist", {
      method: "POST",
      body: JSON.stringify({
        action: "add_tmdb",
        discordUserId,
        tmdbId,
        mediaType,
        priority,
      }),
    });
  },

  doneWatchlist(id: number, completed = true) {
    return request<{ item: WatchlistItem }>("/api/bot/watchlist", {
      method: "POST",
      body: JSON.stringify({ action: "done", id, completed }),
    });
  },

  setWatchlistPriority(id: number, priority: string) {
    return request<{ item: WatchlistItem }>("/api/bot/watchlist", {
      method: "POST",
      body: JSON.stringify({ action: "priority", id, priority }),
    });
  },

  listRecipes() {
    return request<{ items: RecipeItem[] }>("/api/bot/recipes");
  },

  pickRecipe() {
    return request<{ pick: RecipeItem }>("/api/bot/recipes", {
      method: "POST",
      body: JSON.stringify({ action: "random" }),
    });
  },

  addRecipe(
    discordUserId: string,
    videoUrl: string,
    title?: string,
    notes?: string,
  ) {
    return request<{ item: RecipeItem }>("/api/bot/recipes", {
      method: "POST",
      body: JSON.stringify({
        action: "add",
        discordUserId,
        videoUrl,
        title,
        notes,
      }),
    });
  },

  madeRecipe(id: number, made = true) {
    return request<{ item: RecipeItem }>("/api/bot/recipes", {
      method: "POST",
      body: JSON.stringify({ action: "made", id, made }),
    });
  },

  getSchedule(weekOffset = 0) {
    return request<{
      weekStart: string;
      weekEnd: string;
      days: ScheduleDay[];
    }>(`/api/bot/schedule?weekOffset=${weekOffset}`);
  },

  getDaySchedule(day: "today" | "tomorrow") {
    return request<ScheduleDay>(`/api/bot/schedule?day=${day}`);
  },

  getUpcomingReminders(minutes = 60) {
    return request<{ reminders: ShiftReminder[] }>(
      `/api/bot/schedule?upcoming=1&minutes=${minutes}`,
    );
  },

  markRemindersSent(reminders: Array<{ id: number; eventDate: string }>) {
    return request<{ ok: boolean }>("/api/bot/schedule", {
      method: "POST",
      body: JSON.stringify({ action: "mark_reminded", reminders }),
    });
  },

  generateLink(discordUserId: string) {
    return request<{
      code: string;
      expiresInMinutes: number;
      linkUrl: string;
    }>("/api/bot/link", {
      method: "POST",
      body: JSON.stringify({ action: "generate", discordUserId }),
    });
  },

  getLinkStatus(discordUserId: string) {
    const params = new URLSearchParams({ discordUserId });
    return request<{ linked: boolean }>(`/api/bot/link?${params}`);
  },
};
