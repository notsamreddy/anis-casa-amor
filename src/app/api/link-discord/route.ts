import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { redeemLinkCode } from "@/lib/bot-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Sign in first." }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ message: "Enter the code from Discord." }, { status: 400 });
  }

  try {
    await redeemLinkCode(code, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : "Could not link Discord.",
      },
      { status: 400 },
    );
  }
}
