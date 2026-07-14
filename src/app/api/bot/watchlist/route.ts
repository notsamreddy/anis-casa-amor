import { NextResponse } from "next/server";

import type { MediaPriority, MediaType } from "@/db/schema";
import { requireBotAuth, requireLinkedUser } from "@/lib/bot-auth";
import {
  addWatchlistFromTmdb,
  addWatchlistItem,
  listWatchlist,
  pickWatchlistItem,
  searchWatchlist,
  setWatchlistCompleted,
  setWatchlistPriority,
} from "@/lib/bot-data";
import {
  MEDIA_PRIORITIES,
  MEDIA_TYPES,
} from "@/lib/media-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseMediaType(value: string | null | undefined): MediaType | undefined {
  if (!value) {
    return undefined;
  }
  return MEDIA_TYPES.includes(value as MediaType)
    ? (value as MediaType)
    : undefined;
}

function parsePriority(
  value: string | null | undefined,
): MediaPriority | undefined {
  if (!value) {
    return undefined;
  }
  return MEDIA_PRIORITIES.includes(value as MediaPriority)
    ? (value as MediaPriority)
    : undefined;
}

function parsePriorityOrDefault(value: string | null | undefined): MediaPriority {
  return parsePriority(value) ?? "medium";
}

export async function GET(request: Request) {
  const unauthorized = requireBotAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (query) {
    const mediaType = parseMediaType(searchParams.get("mediaType")) ?? "movie";
    try {
      const results = await searchWatchlist(query, mediaType);
      return NextResponse.json({ results });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "Search failed.",
        },
        { status: 400 },
      );
    }
  }

  const mediaType = parseMediaType(searchParams.get("mediaType"));
  if (searchParams.get("mediaType") && !mediaType) {
    return NextResponse.json(
      { message: "mediaType must be movie or series." },
      { status: 400 },
    );
  }

  const items = await listWatchlist(mediaType);
  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      mediaType: item.mediaType,
      priority: item.priority,
      completed: item.completed,
      posterUrl: item.posterUrl,
      tmdbId: item.tmdbId,
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
    discordUserId?: string;
    id?: number;
    title?: string;
    mediaType?: string;
    priority?: string;
    completed?: boolean;
    tmdbId?: number;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const action = body.action?.trim();

  if (action === "pick" || action === "random") {
    const mediaType = parseMediaType(body.mediaType);
    if (body.mediaType && body.mediaType !== "any" && !mediaType) {
      return NextResponse.json(
        { message: "mediaType must be movie or series." },
        { status: 400 },
      );
    }

    const priority = parsePriority(body.priority);
    if (body.priority && !priority) {
      return NextResponse.json(
        { message: "priority must be high, medium, or low." },
        { status: 400 },
      );
    }

    const pick = await pickWatchlistItem(mediaType, priority);
    if (!pick) {
      const hint = priority
        ? `No unwatched ${priority}-priority titles.`
        : "Nothing unwatched to pick.";
      return NextResponse.json(
        { message: `${hint} Add one with /movie add or /movie search!` },
        { status: 404 },
      );
    }

    return NextResponse.json({
      pick: {
        id: pick.id,
        title: pick.title,
        mediaType: pick.mediaType,
        priority: pick.priority,
        posterUrl: pick.posterUrl,
      },
    });
  }

  if (action === "add") {
    const linked = await requireLinkedUser(body.discordUserId);
    if ("error" in linked) {
      return linked.error;
    }

    const mediaType = parseMediaType(body.mediaType) ?? "movie";
    try {
      const movie = await addWatchlistItem({
        userId: linked.userId,
        title: body.title ?? "",
        mediaType,
        priority: parsePriorityOrDefault(body.priority),
      });
      return NextResponse.json({ item: movie });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "Could not add item.",
        },
        { status: 400 },
      );
    }
  }

  if (action === "add_tmdb") {
    const linked = await requireLinkedUser(body.discordUserId);
    if ("error" in linked) {
      return linked.error;
    }

    const tmdbId = Number(body.tmdbId);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      return NextResponse.json({ message: "Valid tmdbId is required." }, { status: 400 });
    }

    const mediaType = parseMediaType(body.mediaType) ?? "movie";
    try {
      const movie = await addWatchlistFromTmdb({
        userId: linked.userId,
        tmdbId,
        mediaType,
        priority: parsePriorityOrDefault(body.priority),
      });
      return NextResponse.json({ item: movie });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "Could not add from TMDB.",
        },
        { status: 400 },
      );
    }
  }

  if (action === "done") {
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Valid id is required." }, { status: 400 });
    }

    const completed = body.completed ?? true;
    try {
      const item = await setWatchlistCompleted(id, completed);
      return NextResponse.json({ item });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "Could not update item.",
        },
        { status: 400 },
      );
    }
  }

  if (action === "priority") {
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ message: "Valid id is required." }, { status: 400 });
    }

    const priority = parsePriority(body.priority);
    if (!priority) {
      return NextResponse.json(
        { message: "priority must be high, medium, or low." },
        { status: 400 },
      );
    }

    try {
      const item = await setWatchlistPriority(id, priority);
      return NextResponse.json({ item });
    } catch (error) {
      return NextResponse.json(
        {
          message:
            error instanceof Error ? error.message : "Could not update priority.",
        },
        { status: 400 },
      );
    }
  }

  return NextResponse.json(
    { message: "Unknown action. Use pick, add, add_tmdb, done, or priority." },
    { status: 400 },
  );
}
