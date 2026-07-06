"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@clerk/nextjs/server";

import {
  addTrackToSpotifyPlaylist,
  deleteSpotifyTokens,
  fetchSpotifyPlaylistTracks,
  fetchSpotifyPlaylists,
  fetchSpotifyTrackDuration,
  fetchSpotifyTrackPreview,
  getSpotifyAccessToken,
  hasSpotifyConnection,
  removeTrackFromSpotifyPlaylist,
  searchSpotifyTracks,
  startSpotifyPlayback,
  type SpotifyPlaylist,
  type SpotifyTrack,
} from "@/lib/spotify";

async function requireUserId() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export async function getSpotifyStatus(): Promise<{ connected: boolean }> {
  const userId = await requireUserId();
  const connected = await hasSpotifyConnection(userId);
  return { connected };
}

export async function getSpotifyPlaylists(): Promise<SpotifyPlaylist[]> {
  const userId = await requireUserId();
  return fetchSpotifyPlaylists(userId);
}

export async function getSpotifyPlaylistTracks(
  playlistId: string,
): Promise<SpotifyTrack[]> {
  const userId = await requireUserId();
  return fetchSpotifyPlaylistTracks(userId, playlistId);
}

export async function searchSpotify(query: string): Promise<SpotifyTrack[]> {
  const userId = await requireUserId();
  return searchSpotifyTracks(userId, query);
}

export async function addToSpotifyPlaylist(
  playlistId: string,
  trackUri: string,
) {
  const userId = await requireUserId();
  await addTrackToSpotifyPlaylist(userId, playlistId, trackUri);
  revalidatePath("/spotify");
}

export async function removeFromSpotifyPlaylist(
  playlistId: string,
  trackUri: string,
) {
  const userId = await requireUserId();
  await removeTrackFromSpotifyPlaylist(userId, playlistId, trackUri);
  revalidatePath("/spotify");
}

export async function disconnectSpotify() {
  const userId = await requireUserId();
  await deleteSpotifyTokens(userId);
  revalidatePath("/spotify");
}

export async function getSpotifyClientToken(): Promise<string> {
  const userId = await requireUserId();
  const token = await getSpotifyAccessToken(userId);
  if (!token) {
    throw new Error("Spotify is not connected.");
  }
  return token;
}

export async function playSpotifyTrackOnDevice(
  deviceId: string,
  trackUri: string,
): Promise<void> {
  const userId = await requireUserId();
  await startSpotifyPlayback(userId, deviceId, trackUri);
}

export async function getSpotifyTrackDuration(trackId: string): Promise<number> {
  const userId = await requireUserId();
  return fetchSpotifyTrackDuration(userId, trackId);
}

export async function getSpotifyTrackPreview(trackId: string): Promise<string | null> {
  const userId = await requireUserId();
  return fetchSpotifyTrackPreview(userId, trackId);
}
