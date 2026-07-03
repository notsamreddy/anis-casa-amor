"use server";

import { auth } from "@clerk/nextjs/server";

import {
  formatDuration,
  getYouTubeVideoInfo,
  type YouTubeVideoInfo,
} from "@/lib/youtube-download";

export type YouTubePreviewResult =
  | {
      ok: true;
      info: YouTubeVideoInfo & { durationLabel: string | null };
    }
  | { ok: false; message: string };

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

function toUserMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("yt-dlp is not installed")) {
    return "MP3 conversion isn't set up on this server yet.";
  }

  if (message.includes("valid YouTube link")) {
    return message;
  }

  if (
    message.includes("Private video") ||
    message.includes("This video is unavailable") ||
    message.includes("Video unavailable")
  ) {
    return "That video isn't available to download.";
  }

  if (message.includes("Sign in to confirm your age")) {
    return "That video is age-restricted and can't be converted here.";
  }

  return "Couldn't load that video. Check the link and try again.";
}

export async function previewYouTubeVideo(
  rawUrl: string,
): Promise<YouTubePreviewResult> {
  await requireUserId();

  try {
    const info = await getYouTubeVideoInfo(rawUrl);

    return {
      ok: true,
      info: {
        ...info,
        durationLabel: formatDuration(info.durationSeconds),
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: toUserMessage(error),
    };
  }
}
