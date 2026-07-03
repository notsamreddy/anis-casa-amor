import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  downloadYouTubeAudio,
  parseDownloadError,
} from "@/lib/converter-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let rawUrl: string;
  try {
    const body = (await request.json()) as { url?: string };
    rawUrl = body.url?.trim() ?? "";
  } catch {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  if (!rawUrl) {
    return NextResponse.json({ message: "Paste a YouTube link first." }, { status: 400 });
  }

  try {
    const { body, mimeType, contentDisposition } =
      await downloadYouTubeAudio(rawUrl);

    if (!body) {
      throw new Error("Converter service returned an empty response.");
    }

    const headers = new Headers({
      "Content-Type": mimeType,
      "Cache-Control": "no-store",
    });

    if (contentDisposition) {
      headers.set("Content-Disposition", contentDisposition);
    }

    return new Response(body, { headers });
  } catch (error) {
    return NextResponse.json(
      { message: parseDownloadError(error) },
      { status: 422 },
    );
  }
}
