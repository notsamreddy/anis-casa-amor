import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { shouldUseLocalhostForApp } from "@/lib/app-origin";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/spotify/callback",
]);

export default clerkMiddleware(async (auth, request) => {
  const url = new URL(request.url);
  const isSpotifyCallback = url.pathname === "/api/spotify/callback";

  if (shouldUseLocalhostForApp(url.hostname) && !isSpotifyCallback) {
    url.hostname = "localhost";
    return NextResponse.redirect(url);
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
