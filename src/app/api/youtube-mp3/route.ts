import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { downloadYouTubeMp3 } from "@/lib/youtube-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const url = new URL(request.url).searchParams.get("url")?.trim();
  if (!url) {
    return errorResponse("Missing YouTube URL.");
  }

  try {
    const result = await downloadYouTubeMp3(url);
    const encodedFilename = encodeURIComponent(result.filename);

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${result.filename}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": String(result.buffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Conversion failed.";

    if (message.includes("yt-dlp is not installed")) {
      return errorResponse("MP3 conversion isn't set up on this server yet.", 503);
    }

    if (message.includes("valid YouTube link")) {
      return errorResponse(message, 400);
    }

    if (
      message.includes("Private video") ||
      message.includes("This video is unavailable") ||
      message.includes("Video unavailable")
    ) {
      return errorResponse("That video isn't available to download.", 400);
    }

    if (message.includes("Sign in to confirm your age")) {
      return errorResponse(
        "That video is age-restricted and can't be converted here.",
        400,
      );
    }

    return errorResponse("Couldn't convert that video. Try another link.", 500);
  }
}
