import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getAppOriginFromRequest } from "@/lib/app-origin";
import { exchangeSpotifyCode, saveSpotifyTokens } from "@/lib/spotify";
import { verifySpotifyOAuthState } from "@/lib/spotify-oauth-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_STATE_COOKIE = "spotify_oauth_state";

export async function GET(request: Request) {
  const origin = getAppOriginFromRequest(request);
  const spotifyPage = new URL("/spotify", origin);
  const callbackUrl = new URL(request.url);

  const error = callbackUrl.searchParams.get("error");
  if (error) {
    spotifyPage.searchParams.set("error", error);
    return NextResponse.redirect(spotifyPage);
  }

  const code = callbackUrl.searchParams.get("code");
  const state = callbackUrl.searchParams.get("state");

  if (!code || !state) {
    spotifyPage.searchParams.set("error", "Spotify authorization failed. Try again.");
    return NextResponse.redirect(spotifyPage);
  }

  const userId = verifySpotifyOAuthState(state);
  if (!userId) {
    spotifyPage.searchParams.set("error", "Spotify authorization failed. Try again.");
    return NextResponse.redirect(spotifyPage);
  }

  const cookieStore = await cookies();
  cookieStore.delete(LEGACY_STATE_COOKIE);

  try {
    const tokens = await exchangeSpotifyCode(code);
    await saveSpotifyTokens(userId, tokens);
    spotifyPage.searchParams.set("connected", "true");
    return NextResponse.redirect(spotifyPage);
  } catch (callbackError) {
    const message =
      callbackError instanceof Error
        ? callbackError.message
        : "Spotify authorization failed.";
    spotifyPage.searchParams.set("error", message);
    return NextResponse.redirect(spotifyPage);
  }
}
