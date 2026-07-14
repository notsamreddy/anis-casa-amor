import { NextResponse } from "next/server";

import { requireBotAuth } from "@/lib/bot-auth";
import {
  getDaySchedule,
  getUpcomingShiftReminders,
  getWeekSchedule,
  markShiftRemindersSent,
} from "@/lib/bot-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = requireBotAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const day = searchParams.get("day");

  if (day === "today") {
    return NextResponse.json(await getDaySchedule(0));
  }

  if (day === "tomorrow") {
    return NextResponse.json(await getDaySchedule(1));
  }

  if (searchParams.get("upcoming") === "1") {
    const withinMinutes = Number(searchParams.get("minutes") ?? "60");
    if (!Number.isInteger(withinMinutes) || withinMinutes < 1 || withinMinutes > 240) {
      return NextResponse.json(
        { message: "minutes must be an integer between 1 and 240." },
        { status: 400 },
      );
    }

    const reminders = await getUpcomingShiftReminders(withinMinutes);
    return NextResponse.json({ reminders });
  }

  const weekOffset = Number(searchParams.get("weekOffset") ?? "0");
  if (!Number.isInteger(weekOffset) || weekOffset < -8 || weekOffset > 8) {
    return NextResponse.json(
      { message: "weekOffset must be an integer between -8 and 8." },
      { status: 400 },
    );
  }

  const schedule = await getWeekSchedule(weekOffset);
  return NextResponse.json(schedule);
}

export async function POST(request: Request) {
  const unauthorized = requireBotAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  let body: {
    action?: string;
    reminders?: Array<{ id: number; eventDate: string }>;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (body.action === "mark_reminded" && Array.isArray(body.reminders)) {
    await markShiftRemindersSent(body.reminders);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ message: "Unknown action." }, { status: 400 });
}
