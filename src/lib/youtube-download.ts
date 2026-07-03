import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseYouTubeVideoId } from "@/lib/youtube";

export type YouTubeVideoInfo = {
  videoId: string;
  title: string;
  channel: string;
  durationSeconds: number | null;
  thumbnailUrl: string;
};

const YT_DLP_BIN = process.env.YT_DLP_PATH ?? "yt-dlp";

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(YT_DLP_BIN, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if ("code" in error && error.code === "ENOENT") {
        reject(
          new Error(
            "yt-dlp is not installed on this server. Install it and ensure ffmpeg is available.",
          ),
        );
        return;
      }

      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      const message = stderr.trim() || stdout.trim() || `yt-dlp exited with code ${code}`;
      reject(new Error(message));
    });
  });
}

export function assertValidYouTubeUrl(rawUrl: string): string {
  const videoId = parseYouTubeVideoId(rawUrl);
  if (!videoId) {
    throw new Error("Paste a valid YouTube link (watch, youtu.be, or shorts).");
  }

  return rawUrl.trim();
}

export async function getYouTubeVideoInfo(rawUrl: string): Promise<YouTubeVideoInfo> {
  const videoUrl = assertValidYouTubeUrl(rawUrl);
  const videoId = parseYouTubeVideoId(videoUrl)!;

  const { stdout } = await runYtDlp([
    "--dump-single-json",
    "--no-download",
    "--no-warnings",
    videoUrl,
  ]);

  let payload: {
    title?: string;
    channel?: string;
    duration?: number;
    thumbnail?: string;
  };

  try {
    payload = JSON.parse(stdout) as typeof payload;
  } catch {
    throw new Error("Could not read video details from YouTube.");
  }

  const title = payload.title?.trim();
  if (!title) {
    throw new Error("Could not read the video title.");
  }

  return {
    videoId,
    title,
    channel: payload.channel?.trim() || "Unknown channel",
    durationSeconds:
      typeof payload.duration === "number" && Number.isFinite(payload.duration)
        ? payload.duration
        : null,
    thumbnailUrl:
      payload.thumbnail ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

export type YouTubeMp3Result = {
  buffer: Buffer;
  filename: string;
  title: string;
};

export async function downloadYouTubeMp3(rawUrl: string): Promise<YouTubeMp3Result> {
  const videoUrl = assertValidYouTubeUrl(rawUrl);
  const info = await getYouTubeVideoInfo(videoUrl);
  const tempDir = await mkdtemp(join(tmpdir(), "yt-mp3-"));
  const outputTemplate = join(tempDir, "audio.%(ext)s");

  try {
    await runYtDlp([
      "--no-playlist",
      "--no-warnings",
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "-o",
      outputTemplate,
      videoUrl,
    ]);

    const buffer = await readFile(join(tempDir, "audio.mp3"));
    const filename = `${sanitizeFilename(info.title) || info.videoId}.mp3`;

    return {
      buffer,
      filename,
      title: info.title,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
