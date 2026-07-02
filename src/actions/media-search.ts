"use server";

import { auth } from "@clerk/nextjs/server";

import type { MediaType } from "@/db/schema";
import {
  getTmdbDetails,
  searchTmdb,
  type MediaDetails,
  type MediaSearchResult,
} from "@/lib/tmdb";

export type MediaDetailsResult =
  | { ok: true; details: MediaDetails }
  | { ok: false; message: string };

function detailsErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("TMDB_API_KEY is not set")) {
    return "Movie details aren't configured on this server.";
  }

  if (message.includes("TMDB_API_KEY is invalid")) {
    return "The TMDB API key is invalid. Check that it was copied exactly.";
  }

  if (message.includes("could not be found") || message.includes("Invalid id")) {
    return "Couldn't find this title on TMDB.";
  }

  return "Could not load details right now.";
}

export async function searchMedia(
  query: string,
  mediaType: MediaType,
): Promise<MediaSearchResult[]> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return searchTmdb(query, mediaType);
}

export async function getMediaDetails(
  tmdbId: number,
  mediaType: MediaType,
): Promise<MediaDetailsResult> {
  const { userId } = await auth();
  if (!userId) {
    return { ok: false, message: "Sign in to view details." };
  }

  try {
    const details = await getTmdbDetails(tmdbId, mediaType);
    return { ok: true, details };
  } catch (error) {
    return { ok: false, message: detailsErrorMessage(error) };
  }
}
