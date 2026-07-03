export type YouTubeEmbed = {
  embedUrl: string;
  isShort: boolean;
};

export type YouTubeVideoRef = {
  videoId: string;
  isShort: boolean;
};

function parseYouTubeUrl(rawUrl: string): YouTubeVideoRef | null {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const isYouTubeHost =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "youtube-nocookie.com";

  if (!isYouTubeHost) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  let videoId: string | null = null;
  let isShort = false;

  if (host === "youtu.be") {
    videoId = segments[0] ?? null;
  } else if (segments[0] === "shorts") {
    videoId = segments[1] ?? null;
    isShort = true;
  } else if (segments[0] === "embed") {
    videoId = segments[1] ?? null;
  } else if (url.pathname === "/watch") {
    videoId = url.searchParams.get("v");
  }

  if (!videoId) {
    return null;
  }

  return { videoId, isShort };
}

/** Returns the 11-char video id from common YouTube URL shapes, or null. */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  return parseYouTubeUrl(rawUrl)?.videoId ?? null;
}

/**
 * Parses common YouTube URL shapes (watch, youtu.be, shorts, embed) and
 * returns an embeddable URL. Shorts are flagged so the player can render
 * in a portrait aspect ratio. Returns null for anything we can't embed.
 */
export function getYouTubeEmbed(rawUrl: string): YouTubeEmbed | null {
  const parsed = parseYouTubeUrl(rawUrl);
  if (!parsed) {
    return null;
  }

  const { videoId, isShort } = parsed;

  const params = new URLSearchParams({
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });

  return {
    embedUrl: `https://www.youtube.com/embed/${videoId}?${params.toString()}`,
    isShort,
  };
}

export function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export async function fetchYouTubeTitle(videoUrl: string): Promise<string | null> {
  if (!extractYouTubeVideoId(videoUrl)) {
    return null;
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
      { next: { revalidate: 86400 } },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { title?: string };
    return typeof data.title === "string" ? data.title : null;
  } catch {
    return null;
  }
}

export function formatYouTubeDuration(seconds: number | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}
