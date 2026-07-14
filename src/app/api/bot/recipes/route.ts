import { NextResponse } from "next/server";

import { requireBotAuth, requireLinkedUser } from "@/lib/bot-auth";
import {
  addRecipe,
  listRecipes,
  pickRecipe,
  setRecipeMade,
} from "@/lib/bot-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = requireBotAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const recipes = await listRecipes();
  return NextResponse.json({
    items: recipes.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      videoUrl: recipe.videoUrl,
      made: recipe.made,
      rating: recipe.rating,
      notes: recipe.notes,
    })),
  });
}

export async function POST(request: Request) {
  const unauthorized = requireBotAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  let body: {
    action?: string;
    id?: number;
    made?: boolean;
    discordUserId?: string;
    videoUrl?: string;
    title?: string;
    notes?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const action = body.action?.trim();

  if (action === "pick" || action === "random") {
    const pick = await pickRecipe();
    if (!pick) {
      return NextResponse.json(
        { message: "No recipes saved yet. Add one with /recipe add!" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      pick: {
        id: pick.id,
        title: pick.title,
        videoUrl: pick.videoUrl,
        made: pick.made,
        rating: pick.rating,
        notes: pick.notes,
      },
    });
  }

  if (action === "add") {
    const linked = await requireLinkedUser(body.discordUserId);
    if ("error" in linked) {
      return linked.error;
    }

    if (!body.videoUrl?.trim()) {
      return NextResponse.json(
        { message: "videoUrl (YouTube link) is required." },
        { status: 400 },
      );
    }

    try {
      const item = await addRecipe({
        userId: linked.userId,
        videoUrl: body.videoUrl,
        title: body.title,
        notes: body.notes,
      });
      return NextResponse.json({ item });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "Could not add recipe.",
        },
        { status: 400 },
      );
    }
  }

  if (action === "made") {
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Valid id is required." }, { status: 400 });
    }

    const made = body.made ?? true;
    try {
      const item = await setRecipeMade(id, made);
      return NextResponse.json({ item });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "Could not update recipe.",
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json(
    { message: "Unknown action. Use pick, add, or made." },
    { status: 400 },
  );
}
