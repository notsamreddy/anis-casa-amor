"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";
import { and, eq, gte, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { scheduleEvents } from "@/db/schema";
import { extractScheduleFromImage } from "@/lib/gemini";
import {
  addDays,
  type ParsedSchedule,
  type ScheduleEventInput,
} from "@/lib/schedule-types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type ParseScheduleResult =
  | { ok: true; schedule: ParsedSchedule }
  | { ok: false; message: string };

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

function parseErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("GEMINI_API_KEY is not set")) {
    return "Schedule import isn't set up on this server.";
  }

  if (message.includes("429") || message.toLowerCase().includes("quota")) {
    return "Import limit reached. Try again later.";
  }

  if (message) {
    return message;
  }

  return "Could not analyze the screenshot.";
}

export async function parseScheduleImage(
  formData: FormData,
): Promise<ParseScheduleResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, message: "Sign in to import a schedule." };
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return { ok: false, message: "Choose a screenshot to upload." };
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return { ok: false, message: "Use a PNG, JPG, or WebP screenshot." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "Screenshot must be 5 MB or smaller." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const schedule = await extractScheduleFromImage(
      buffer.toString("base64"),
      file.type,
    );

    if (schedule.events.length === 0) {
      return {
        ok: false,
        message: "No schedule events were found in that screenshot.",
      };
    }

    return { ok: true, schedule };
  } catch (error) {
    return { ok: false, message: parseErrorMessage(error) };
  }
}

export async function saveScheduleWeek(
  weekStart: string,
  events: ScheduleEventInput[],
) {
  const userId = await requireUserId();
  const weekEnd = addDays(weekStart, 6);
  const db = getDb();
  const weekFilter = and(
    eq(scheduleEvents.userId, userId),
    gte(scheduleEvents.eventDate, weekStart),
    lte(scheduleEvents.eventDate, weekEnd),
  );

  await db.delete(scheduleEvents).where(weekFilter);

  if (events.length > 0) {
    await db.insert(scheduleEvents).values(
      events.map((event) => ({
        userId,
        eventDate: event.eventDate,
        type: event.type,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        allDay: event.allDay,
        hasConflict: event.hasConflict,
      })),
    );
  }

  revalidatePath("/schedule");
}

export async function clearScheduleWeek(weekStart: string) {
  const userId = await requireUserId();
  const weekEnd = addDays(weekStart, 6);

  await getDb()
    .delete(scheduleEvents)
    .where(
      and(
        eq(scheduleEvents.userId, userId),
        gte(scheduleEvents.eventDate, weekStart),
        lte(scheduleEvents.eventDate, weekEnd),
      ),
    );

  revalidatePath("/schedule");
}
