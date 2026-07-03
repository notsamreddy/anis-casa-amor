import { extractYouTubeVideoId } from "@/lib/youtube";

export type YouTubeAudioInfo = {
  videoId: string;
  title: string;
  durationLabel: string | null;
  thumbnailUrl: string | null;
  filename: string;
};

type ConverterServiceConfig = {
  baseUrl: string;
  secret: string;
};

function getConverterServiceConfig(): ConverterServiceConfig {
  const baseUrl = process.env.CONVERTER_SERVICE_URL?.replace(/\/$/, "");
  const secret = process.env.CONVERTER_SERVICE_SECRET;

  if (!baseUrl || !secret) {
    throw new Error(
      "Converter service is not configured. Set CONVERTER_SERVICE_URL and CONVERTER_SERVICE_SECRET.",
    );
  }

  return { baseUrl, secret };
}

async function converterServiceFetch(
  path: string,
  body: { url: string },
): Promise<Response> {
  const { baseUrl, secret } = getConverterServiceConfig();

  let response: Response;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    };

    if (baseUrl.includes("ngrok")) {
      headers["ngrok-skip-browser-warning"] = "true";
    }

    response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "Your converter PC is offline. Make sure the service is running.",
    );
  }

  return response;
}

async function readServiceError(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | null;

  return payload?.message ?? "Converter service request failed.";
}

export async function getYouTubeAudioInfo(rawUrl: string): Promise<YouTubeAudioInfo> {
  if (!extractYouTubeVideoId(rawUrl)) {
    throw new Error("That doesn't look like a valid YouTube link.");
  }

  const response = await converterServiceFetch("/info", { url: rawUrl });
  if (!response.ok) {
    throw new Error(await readServiceError(response));
  }

  const info = (await response.json()) as YouTubeAudioInfo;
  return info;
}

export async function downloadYouTubeAudio(rawUrl: string): Promise<{
  body: ReadableStream<Uint8Array> | null;
  filename: string;
  mimeType: string;
  contentDisposition: string | null;
}> {
  if (!extractYouTubeVideoId(rawUrl)) {
    throw new Error("That doesn't look like a valid YouTube link.");
  }

  const response = await converterServiceFetch("/download", { url: rawUrl });
  if (!response.ok) {
    throw new Error(await readServiceError(response));
  }

  return {
    body: response.body,
    filename: "audio.mp3",
    mimeType: response.headers.get("Content-Type") ?? "audio/mpeg",
    contentDisposition: response.headers.get("Content-Disposition"),
  };
}

export function parseDownloadError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";

  if (
    message.includes("not configured") ||
    message.includes("offline") ||
    message.includes("valid YouTube link") ||
    message.includes("ffmpeg") ||
    message.includes("private") ||
    message.includes("unavailable")
  ) {
    return message;
  }

  return "Couldn't download that video. Double-check the link and try again.";
}
