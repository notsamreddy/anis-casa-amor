function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, " ");
}

type CaptionTrack = {
  baseUrl?: string;
  languageCode?: string;
};

export async function fetchYouTubeTranscript(
  videoId: string,
): Promise<string | null> {
  try {
    const pageResponse = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      {
        headers: {
          "Accept-Language": "en-US,en;q=0.9",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!pageResponse.ok) {
      return null;
    }

    const html = await pageResponse.text();
    const captionsMatch = html.match(/"captionTracks":(\[.*?\]),"videoDetails"/);

    if (!captionsMatch) {
      return null;
    }

    let tracks: CaptionTrack[];
    try {
      tracks = JSON.parse(captionsMatch[1]) as CaptionTrack[];
    } catch {
      return null;
    }

    if (tracks.length === 0) {
      return null;
    }

    const track =
      tracks.find((entry) => entry.languageCode?.startsWith("en")) ??
      tracks[0];

    if (!track?.baseUrl) {
      return null;
    }

    const captionResponse = await fetch(track.baseUrl);
    if (!captionResponse.ok) {
      return null;
    }

    const xml = await captionResponse.text();
    const segments = [...xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
      .map((match) => decodeXmlEntities(match[1] ?? "").trim())
      .filter(Boolean);

    const transcript = segments.join(" ").replace(/\s+/g, " ").trim();
    return transcript || null;
  } catch {
    return null;
  }
}
