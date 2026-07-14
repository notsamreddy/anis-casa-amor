import { randomBytes } from "node:crypto";

import { and, eq, gt, lt } from "drizzle-orm";

import { getDb } from "@/db";
import { discordLinkCodes, discordLinks } from "@/db/schema";

const CODE_TTL_MS = 15 * 60 * 1000;

function generateCode(): string {
  return randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
}

export async function createLinkCode(discordUserId: string) {
  const db = getDb();
  const now = Date.now();

  await db
    .delete(discordLinkCodes)
    .where(lt(discordLinkCodes.expiresAt, now));

  await db
    .delete(discordLinkCodes)
    .where(eq(discordLinkCodes.discordUserId, discordUserId));

  let code = generateCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await db.insert(discordLinkCodes).values({
        code,
        discordUserId,
        expiresAt: now + CODE_TTL_MS,
      });
      break;
    } catch {
      code = generateCode();
    }
  }

  return { code, expiresInMinutes: 15 };
}

export async function redeemLinkCode(code: string, clerkUserId: string) {
  const db = getDb();
  const now = Date.now();
  const normalized = code.trim().toUpperCase();

  const [row] = await db
    .select()
    .from(discordLinkCodes)
    .where(
      and(
        eq(discordLinkCodes.code, normalized),
        gt(discordLinkCodes.expiresAt, now),
      ),
    )
    .limit(1);

  if (!row) {
    throw new Error("Invalid or expired code. Run /link in Discord again.");
  }

  await db
    .insert(discordLinks)
    .values({
      discordUserId: row.discordUserId,
      clerkUserId,
      linkedAt: now,
    })
    .onConflictDoUpdate({
      target: discordLinks.discordUserId,
      set: { clerkUserId, linkedAt: now },
    });

  await db
    .delete(discordLinkCodes)
    .where(eq(discordLinkCodes.code, normalized));

  return { discordUserId: row.discordUserId };
}

export async function getClerkUserIdForDiscord(
  discordUserId: string,
): Promise<string | null> {
  const [link] = await getDb()
    .select({ clerkUserId: discordLinks.clerkUserId })
    .from(discordLinks)
    .where(eq(discordLinks.discordUserId, discordUserId))
    .limit(1);

  return link?.clerkUserId ?? null;
}

export async function getLinkStatus(discordUserId: string) {
  const linked = await getClerkUserIdForDiscord(discordUserId);
  return { linked: Boolean(linked) };
}
