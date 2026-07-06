import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";

import { SpotifySection } from "@/components/spotify-section";
import { buttonVariants } from "@/components/ui/button";
import { hasSpotifyConnection, fetchSpotifyPlaylists, SpotifyScopeError } from "@/lib/spotify";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SpotifyPageProps = {
  searchParams: Promise<{
    error?: string;
    connected?: string;
  }>;
};

export default async function SpotifyPage({ searchParams }: SpotifyPageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const params = await searchParams;
  let connected = await hasSpotifyConnection(userId);
  let playlists: Awaited<ReturnType<typeof fetchSpotifyPlaylists>> = [];
  let loadError = params.error ?? null;

  if (connected) {
    try {
      playlists = await fetchSpotifyPlaylists(userId);
    } catch (error) {
      connected = false;
      if (error instanceof SpotifyScopeError) {
        loadError = error.message;
      } else if (error instanceof Error) {
        loadError = error.message;
      } else {
        loadError = "Could not load Spotify playlists.";
      }
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-ml-2",
        )}
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <SpotifySection
        initialConnected={connected}
        initialPlaylists={playlists}
        initialError={loadError}
        justConnected={params.connected === "true"}
      />
    </div>
  );
}
