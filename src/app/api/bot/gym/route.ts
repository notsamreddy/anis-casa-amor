import { NextResponse } from "next/server";

import { requireBotAuth, requireLinkedUser } from "@/lib/bot-auth";
import { getGymWorkout, toggleGymExercise } from "@/lib/bot-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = requireBotAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "";
  const linked = await requireLinkedUser(searchParams.get("discordUserId") ?? undefined);
  if ("error" in linked) {
    return linked.error;
  }

  try {
    const workout = await getGymWorkout(type, linked.userId);
    return NextResponse.json(workout);
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not load workout.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireBotAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  let body: {
    discordUserId?: string;
    exerciseId?: number;
    completed?: boolean;
    type?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const linked = await requireLinkedUser(body.discordUserId);
  if ("error" in linked) {
    return linked.error;
  }

  const exerciseId = Number(body.exerciseId);
  if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
    return NextResponse.json(
      { message: "Valid exerciseId is required." },
      { status: 400 },
    );
  }

  if (typeof body.completed !== "boolean") {
    return NextResponse.json(
      { message: "completed must be true or false." },
      { status: 400 },
    );
  }

  try {
    await toggleGymExercise(linked.userId, exerciseId, body.completed);
    const type = body.type?.trim();
    if (type) {
      const workout = await getGymWorkout(type, linked.userId);
      return NextResponse.json(workout);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not update exercise.",
      },
      { status: 400 },
    );
  }
}
