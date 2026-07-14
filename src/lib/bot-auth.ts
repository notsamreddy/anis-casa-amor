import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { getClerkUserIdForDiscord } from "@/lib/bot-links";

/**
 * Fallback map when DB link is missing.
 * Example: DISCORD_USER_MAP={"1234567890":"user_abc"}
 */
function resolveEnvClerkUserId(discordUserId: string): string | null {
  const raw = process.env.DISCORD_USER_MAP?.trim();
  if (!raw) {
    return null;
  }

  try {
    const map = JSON.parse(raw) as Record<string, string>;
    const clerkUserId = map[discordUserId]?.trim();
    return clerkUserId || null;
  } catch {
    return null;
  }
}

export async function resolveClerkUserId(
  discordUserId: string,
): Promise<string | null> {
  const fromDb = await getClerkUserIdForDiscord(discordUserId);
  if (fromDb) {
    return fromDb;
  }
  return resolveEnvClerkUserId(discordUserId);
}

function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

export function requireBotAuth(request: Request): NextResponse | null {
  const expected = process.env.DISCORD_BOT_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { message: "DISCORD_BOT_SECRET is not configured." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";

  if (!token || !secretsMatch(token, expected)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function requireLinkedUser(
  discordUserId: string | undefined,
): Promise<{ userId: string } | { error: NextResponse }> {
  if (!discordUserId?.trim()) {
    return {
      error: NextResponse.json(
        { message: "discordUserId is required." },
        { status: 400 },
      ),
    };
  }

  const userId = await resolveClerkUserId(discordUserId.trim());
  if (!userId) {
    return {
      error: NextResponse.json(
        {
          message:
            "Your Discord isn't linked yet. Run /link in Discord, then enter the code at /link-discord on the site.",
        },
        { status: 403 },
      ),
    };
  }

  return { userId };
}
