"use server";

import { auth } from "@clerk/nextjs/server";

import type { MediaType } from "@/db/schema";
import { searchTmdb, getTmdbDetails, type MediaSearchResult } from "@/lib/tmdb";

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

export async function getMediaDetails(tmdbId: number, mediaType: MediaType) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  return getTmdbDetails(tmdbId, mediaType);
}
