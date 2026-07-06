import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { getAppOriginFromRequest } from "@/lib/app-origin";
import { getSpotifyAuthUrl } from "@/lib/spotify";
import { createSpotifyOAuthState } from "@/lib/spotify-oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = getAppOriginFromRequest(request);
  const spotifyPage = new URL("/spotify", origin);

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", origin));
  }

  try {
    const state = createSpotifyOAuthState(userId);
    const authUrl = getSpotifyAuthUrl(state);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Spotify connect failed";
    spotifyPage.searchParams.set("error", message);
    return NextResponse.redirect(spotifyPage);
  }
}
