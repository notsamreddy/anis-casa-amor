"use server";

import { auth } from "@clerk/nextjs/server";

import {
  getYouTubeAudioInfo,
  parseDownloadError,
  type YouTubeAudioInfo,
} from "@/lib/converter-service";

export type YouTubeAudioPreviewResult =
  | { ok: true; info: YouTubeAudioInfo }
  | { ok: false; message: string };

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function previewYouTubeAudio(
  rawUrl: string,
): Promise<YouTubeAudioPreviewResult> {
  try {
    await requireUserId();

    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return { ok: false, message: "Paste a YouTube link first." };
    }

    const info = await getYouTubeAudioInfo(trimmed);
    return { ok: true, info };
  } catch (error) {
    return { ok: false, message: parseDownloadError(error) };
  }
}
