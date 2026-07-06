import Link from "next/link";
import { CalendarDays, ChefHat, ChevronRight, Disc3, Dumbbell, Film, Music2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const HUB_OPTIONS = [
  {
    href: "/gym",
    label: "Gym",
    description: "Track workouts and check off exercises",
    icon: Dumbbell,
    accent: "bg-violet-600",
  },
  {
    href: "/movies",
    label: "Watchlist",
    description: "Movies and series to watch",
    icon: Film,
    accent: "bg-fuchsia-600",
  },
  {
    href: "/recipes",
    label: "Recipes",
    description: "Save YouTube Shorts and pick one at random",
    icon: ChefHat,
    accent: "bg-amber-600",
  },
  {
    href: "/schedule",
    label: "Schedule",
    description: "Import work shifts from a screenshot",
    icon: CalendarDays,
    accent: "bg-sky-600",
  },
  {
    href: "/converter",
    label: "Music Downloader",
    description: "Download audio from YouTube links",
    icon: Music2,
    accent: "bg-rose-600",
  },
  {
    href: "/spotify",
    label: "Spotify Swipe",
    description: "Swipe to clean up playlists",
    icon: Disc3,
    accent: "bg-emerald-600",
  },
] as const;

export function HubPicker() {
  return (
    <div className="grid w-full min-w-0 gap-2.5 sm:gap-3">
      {HUB_OPTIONS.map((option) => {
        const Icon = option.icon;

        return (
          <Link
            key={option.href}
            href={option.href}
            className="group block w-full min-w-0 max-w-full"
          >
            <Card className="relative w-full min-w-0 overflow-hidden py-0 ring-1 ring-border transition-colors duration-200 hover:border-foreground/20 hover:bg-muted/40">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  option.accent,
                )}
              />
              <CardContent className="flex min-w-0 items-center gap-3 py-4 pl-4 pr-3 sm:gap-4 sm:py-4 sm:pl-5 sm:pr-4">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl text-white sm:size-11",
                    option.accent,
                  )}
                >
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-base font-semibold tracking-tight sm:text-lg">
                    {option.label}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>

                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 sm:size-5" />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
