import { NextResponse } from "next/server";

import { requireBotAuth } from "@/lib/bot-auth";
import {
  createLinkCode,
  getLinkStatus,
} from "@/lib/bot-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const unauthorized = requireBotAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { searchParams } = new URL(request.url);
  const discordUserId = searchParams.get("discordUserId")?.trim();
  if (!discordUserId) {
    return NextResponse.json(
      { message: "discordUserId is required." },
      { status: 400 },
    );
  }

  const status = await getLinkStatus(discordUserId);
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const unauthorized = requireBotAuth(request);
  if (unauthorized) {
    return unauthorized;
  }

  let body: {
    action?: string;
    discordUserId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (body.action !== "generate") {
    return NextResponse.json({ message: "Unknown action." }, { status: 400 });
  }

  const discordUserId = body.discordUserId?.trim();
  if (!discordUserId) {
    return NextResponse.json(
      { message: "discordUserId is required." },
      { status: 400 },
    );
  }

  const { code, expiresInMinutes } = await createLinkCode(discordUserId);
  const baseUrl = (process.env.CASA_API_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  return NextResponse.json({
    code,
    expiresInMinutes,
    linkUrl: `${baseUrl}/link-discord`,
  });
}
