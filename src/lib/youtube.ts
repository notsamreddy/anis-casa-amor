export type YouTubeEmbed = {
  embedUrl: string;
  isShort: boolean;
};

export type ParsedYouTubeUrl = {
  videoId: string;
  isShort: boolean;
};

function parseYouTubeUrl(rawUrl: string): ParsedYouTubeUrl | null {
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

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return null;
  }

  return { videoId, isShort };
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

  const params = new URLSearchParams({
    rel: "0",
    playsinline: "1",
    modestbranding: "1",
  });

  return {
    embedUrl: `https://www.youtube.com/embed/${parsed.videoId}?${params.toString()}`,
    isShort: parsed.isShort,
  };
}

export function parseYouTubeVideoId(rawUrl: string): string | null {
  return parseYouTubeUrl(rawUrl)?.videoId ?? null;
}

export function isValidYouTubeUrl(rawUrl: string): boolean {
  return parseYouTubeVideoId(rawUrl) !== null;
}
