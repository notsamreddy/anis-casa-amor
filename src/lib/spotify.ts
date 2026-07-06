import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { spotifyTokens } from "@/db/schema";

const SPOTIFY_ACCOUNTS_URL = "https://accounts.spotify.com";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

export const SPOTIFY_SCOPE_LIST = [
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
] as const;

export const SPOTIFY_SCOPES = SPOTIFY_SCOPE_LIST.join(" ");

export class SpotifyForbiddenError extends Error {
  constructor(
    message = "You can only review playlists you own or collaborate on. Followed playlists are not supported.",
  ) {
    super(message);
    this.name = "SpotifyForbiddenError";
  }
}

export class SpotifyScopeError extends Error {
  constructor(message = "Spotify permissions are missing. Connect again to grant playlist access.") {
    super(message);
    this.name = "SpotifyScopeError";
  }
}

export type SpotifyTrack = {
  id: string;
  uri: string;
  name: string;
  artists: string;
  album: string;
  albumArtUrl: string | null;
  previewUrl: string | null;
  durationMs: number;
  spotifyUrl: string;
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
  imageUrl: string | null;
  trackCount: number;
  canEdit: boolean;
};

type SpotifyTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

type SpotifyApiTrack = {
  id: string;
  uri: string;
  name: string;
  type?: string;
  duration_ms?: number;
  preview_url?: string | null;
  artists: Array<{ name: string }> | null;
  album: {
    name: string;
    images: Array<{ url: string }> | null;
  } | null;
};

type SpotifyPlaylistItem = {
  id: string;
  name: string;
  images: Array<{ url: string }> | null;
  tracks?: { total: number } | null;
  items?: { total: number } | null;
  collaborative?: boolean;
  owner?: { id: string } | null;
};

type SpotifyPlaylistEntry = {
  track?: SpotifyApiTrack | null;
  item?: SpotifyApiTrack | null;
};

function getPlaylistTrackCount(playlist: SpotifyPlaylistItem) {
  return playlist.items?.total ?? playlist.tracks?.total ?? 0;
}

function playlistCanEdit(playlist: SpotifyPlaylistItem, spotifyUserId: string) {
  return (
    playlist.owner?.id === spotifyUserId || playlist.collaborative === true
  );
}

function getPlaylistEntryTrack(entry: SpotifyPlaylistEntry): SpotifyApiTrack | null {
  const candidate = entry.item ?? entry.track;
  if (!candidate?.id || !candidate.uri) {
    return null;
  }

  if (candidate.type && candidate.type !== "track") {
    return null;
  }

  return candidate;
}

function getSpotifyConfig() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Spotify is not configured. Add SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI.");
  }

  return { clientId, clientSecret, redirectUri };
}

function mapTrack(track: SpotifyApiTrack): SpotifyTrack | null {
  if (!track.id || !track.uri) {
    return null;
  }

  return {
    id: track.id,
    uri: track.uri,
    name: track.name ?? "Unknown track",
    artists:
      track.artists?.map((artist) => artist.name).filter(Boolean).join(", ") ||
      "Unknown artist",
    album: track.album?.name ?? "Unknown album",
    albumArtUrl: track.album?.images?.[0]?.url ?? null,
    previewUrl: track.preview_url ?? null,
    durationMs: track.duration_ms ?? 0,
    spotifyUrl: `https://open.spotify.com/track/${track.id}`,
  };
}

const SPOTIFY_PAGE_SIZE = 50;
const SPOTIFY_SEARCH_LIMIT = 10;

function buildSpotifyPagePath(
  path: string,
  offset = 0,
  extraParams?: Record<string, string>,
) {
  const url = new URL(path, "https://api.spotify.com");
  url.searchParams.set("limit", String(SPOTIFY_PAGE_SIZE));
  url.searchParams.set("offset", String(Math.max(0, offset)));

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
  }

  return `${url.pathname}${url.search}`;
}

async function fetchSpotifyPages<T>(
  accessToken: string,
  buildPath: (offset: number) => string,
  onPage: (items: T[]) => void,
) {
  let offset = 0;

  while (true) {
    const data: SpotifyPagedResponse<T> = await spotifyRequest(
      accessToken,
      buildPath(offset),
    );

    const items = data.items ?? [];
    if (items.length === 0) {
      break;
    }

    onPage(items);
    offset += items.length;

    if (!data.next || items.length < SPOTIFY_PAGE_SIZE) {
      break;
    }
  }
}

type SpotifyPagedResponse<T> = {
  items: T[];
  next: string | null;
};

function getMissingScopes(grantedScope?: string | null) {
  const granted = new Set(
    (grantedScope ?? "")
      .split(" ")
      .map((scope) => scope.trim())
      .filter(Boolean),
  );

  return SPOTIFY_SCOPE_LIST.filter((scope) => !granted.has(scope));
}

function assertGrantedScopes(grantedScope?: string) {
  const missing = getMissingScopes(grantedScope);
  if (missing.length > 0) {
    throw new SpotifyScopeError(
      `Spotify did not grant required permissions: ${missing.join(", ")}. Connect again and approve all playlist permissions.`,
    );
  }
}

function isInsufficientScopeResponse(status: number, body: string) {
  return status === 403 && body.toLowerCase().includes("insufficient client scope");
}

function isForbiddenResponse(status: number) {
  return status === 403;
}

async function spotifyRequest<T>(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${SPOTIFY_API_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    if (isInsufficientScopeResponse(response.status, body)) {
      throw new SpotifyScopeError();
    }
    if (isForbiddenResponse(response.status)) {
      throw new SpotifyForbiddenError();
    }
    throw new Error(`Spotify API error (${response.status}): ${body}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function getSpotifyAuthUrl(state: string) {
  const { clientId, redirectUri } = getSpotifyConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "true",
  });

  return `${SPOTIFY_ACCOUNTS_URL}/authorize?${params.toString()}`;
}

export async function exchangeSpotifyCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getSpotifyConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Spotify token exchange failed: ${errorBody}`);
  }

  return response.json() as Promise<SpotifyTokenResponse>;
}

async function refreshSpotifyAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = getSpotifyConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(`${SPOTIFY_ACCOUNTS_URL}/api/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Spotify token refresh failed: ${errorBody}`);
  }

  return response.json() as Promise<SpotifyTokenResponse>;
}

export async function saveSpotifyTokens(
  userId: string,
  tokens: SpotifyTokenResponse,
  existingRefreshToken?: string,
  existingScope?: string | null,
) {
  assertGrantedScopes(tokens.scope ?? existingScope ?? undefined);

  const refreshToken = tokens.refresh_token ?? existingRefreshToken;
  if (!refreshToken) {
    throw new Error("Spotify did not return a refresh token.");
  }

  const scope = tokens.scope ?? existingScope;
  if (!scope) {
    throw new SpotifyScopeError();
  }

  const expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in - 60;

  await getDb()
    .insert(spotifyTokens)
    .values({
      userId,
      accessToken: tokens.access_token,
      refreshToken,
      expiresAt,
      scope,
    })
    .onConflictDoUpdate({
      target: spotifyTokens.userId,
      set: {
        accessToken: tokens.access_token,
        refreshToken,
        expiresAt,
        scope,
      },
    });
}

export async function deleteSpotifyTokens(userId: string) {
  await getDb().delete(spotifyTokens).where(eq(spotifyTokens.userId, userId));
}

export async function hasSpotifyConnection(userId: string) {
  const [row] = await getDb()
    .select({
      userId: spotifyTokens.userId,
      scope: spotifyTokens.scope,
    })
    .from(spotifyTokens)
    .where(eq(spotifyTokens.userId, userId))
    .limit(1);

  if (!row) {
    return false;
  }

  if (getMissingScopes(row.scope).length > 0) {
    await deleteSpotifyTokens(userId);
    return false;
  }

  return true;
}

async function withSpotifyAccessToken<T>(
  userId: string,
  callback: (accessToken: string) => Promise<T>,
): Promise<T> {
  const [row] = await getDb()
    .select()
    .from(spotifyTokens)
    .where(eq(spotifyTokens.userId, userId))
    .limit(1);

  if (!row) {
    throw new Error("Spotify is not connected.");
  }

  if (getMissingScopes(row.scope).length > 0) {
    await deleteSpotifyTokens(userId);
    throw new SpotifyScopeError();
  }

  let accessToken = row.accessToken;
  const now = Math.floor(Date.now() / 1000);

  if (row.expiresAt <= now) {
    const refreshed = await refreshSpotifyAccessToken(row.refreshToken);
    await saveSpotifyTokens(userId, refreshed, row.refreshToken, row.scope);
    accessToken = refreshed.access_token;
  }

  try {
    return await callback(accessToken);
  } catch (error) {
    if (error instanceof SpotifyScopeError) {
      await deleteSpotifyTokens(userId);
    }
    throw error;
  }
}

export async function getSpotifyAccessToken(
  userId: string,
  options?: { forceRefresh?: boolean },
) {
  const [row] = await getDb()
    .select()
    .from(spotifyTokens)
    .where(eq(spotifyTokens.userId, userId))
    .limit(1);

  if (!row) {
    return null;
  }

  if (getMissingScopes(row.scope).length > 0) {
    await deleteSpotifyTokens(userId);
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!options?.forceRefresh && row.expiresAt > now) {
    return row.accessToken;
  }

  const refreshed = await refreshSpotifyAccessToken(row.refreshToken);
  await saveSpotifyTokens(userId, refreshed, row.refreshToken, row.scope);
  return refreshed.access_token;
}

export async function fetchSpotifyPlaylists(userId: string): Promise<SpotifyPlaylist[]> {
  return withSpotifyAccessToken(userId, async (accessToken) => {
    const profile = await spotifyRequest<{ id: string }>(accessToken, "/me");
    const playlists: SpotifyPlaylist[] = [];

    await fetchSpotifyPages<SpotifyPlaylistItem>(
      accessToken,
      (offset) => buildSpotifyPagePath("/me/playlists", offset),
      (items) => {
        playlists.push(
          ...items.map((playlist) => ({
            id: playlist.id,
            name: playlist.name,
            imageUrl: playlist.images?.[0]?.url ?? null,
            trackCount: getPlaylistTrackCount(playlist),
            canEdit: playlistCanEdit(playlist, profile.id),
          })),
        );
      },
    );

    return playlists;
  });
}

export async function fetchSpotifyPlaylistTracks(
  userId: string,
  playlistId: string,
): Promise<SpotifyTrack[]> {
  return withSpotifyAccessToken(userId, async (accessToken) => {
    const tracks: SpotifyTrack[] = [];

    await fetchSpotifyPages<SpotifyPlaylistEntry>(
      accessToken,
      (offset) =>
        buildSpotifyPagePath(`/playlists/${playlistId}/items`, offset, {
          additional_types: "track",
        }),
      (items) => {
        for (const entry of items) {
          const track = getPlaylistEntryTrack(entry);
          if (!track) {
            continue;
          }

          const mappedTrack = mapTrack(track);
          if (mappedTrack) {
            tracks.push(mappedTrack);
          }
        }
      },
    );

    return tracks;
  });
}

export async function fetchSpotifyTrackDuration(
  userId: string,
  trackId: string,
): Promise<number> {
  return withSpotifyAccessToken(userId, async (accessToken) => {
    const track = await spotifyRequest<SpotifyApiTrack>(
      accessToken,
      `/tracks/${trackId}`,
    );
    return track.duration_ms ?? 0;
  });
}

export async function fetchSpotifyTrackPreview(
  userId: string,
  trackId: string,
): Promise<string | null> {
  return withSpotifyAccessToken(userId, async (accessToken) => {
    const track = await spotifyRequest<SpotifyApiTrack>(
      accessToken,
      `/tracks/${trackId}`,
    );
    return track.preview_url ?? null;
  });
}

export async function searchSpotifyTracks(
  userId: string,
  query: string,
): Promise<SpotifyTrack[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  return withSpotifyAccessToken(userId, async (accessToken) => {
    const params = new URLSearchParams({
      q: trimmed,
      type: "track",
      limit: String(SPOTIFY_SEARCH_LIMIT),
    });

    const data = await spotifyRequest<{ tracks: { items: SpotifyApiTrack[] } }>(
      accessToken,
      `/search?${params.toString()}`,
    );

    return data.tracks.items
      .map(mapTrack)
      .filter((track): track is SpotifyTrack => track !== null);
  });
}

export async function addTrackToSpotifyPlaylist(
  userId: string,
  playlistId: string,
  trackUri: string,
) {
  await withSpotifyAccessToken(userId, async (accessToken) => {
    await spotifyRequest(
      accessToken,
      `/playlists/${playlistId}/items`,
      {
        method: "POST",
        body: JSON.stringify({ uris: [trackUri] }),
      },
    );
  });
}

export async function removeTrackFromSpotifyPlaylist(
  userId: string,
  playlistId: string,
  trackUri: string,
) {
  await withSpotifyAccessToken(userId, async (accessToken) => {
    await spotifyRequest(accessToken, `/playlists/${playlistId}/items`, {
      method: "DELETE",
      body: JSON.stringify({ items: [{ uri: trackUri }] }),
    });
  });
}

export async function startSpotifyPlayback(
  userId: string,
  deviceId: string,
  trackUri: string,
) {
  await withSpotifyAccessToken(userId, async (accessToken) => {
    const transferResponse = await fetch(
      `${SPOTIFY_API_URL}/me/player`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [deviceId],
          play: false,
        }),
      },
    );

    if (
      transferResponse.status !== 204 &&
      transferResponse.status !== 404 &&
      !transferResponse.ok
    ) {
      const body = await transferResponse.text();
      throw new Error(
        body
          ? `Could not activate Spotify player (${transferResponse.status}).`
          : "Could not activate Spotify player.",
      );
    }

    const playResponse = await fetch(
      `${SPOTIFY_API_URL}/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [trackUri] }),
      },
    );

    if (playResponse.status === 401) {
      throw new Error("Spotify session expired. Reconnect Spotify.");
    }

    if (playResponse.status === 403) {
      throw new Error("Full playback needs Spotify Premium.");
    }

    if (playResponse.status !== 204 && !playResponse.ok) {
      const body = await playResponse.text();
      throw new Error(
        body
          ? `Could not start playback (${playResponse.status}).`
          : "Could not start playback.",
      );
    }
  });
}
