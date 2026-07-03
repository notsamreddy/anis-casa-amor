import Link from "next/link";
import { CalendarDays, ChevronRight, Dumbbell, Film, Music2 } from "lucide-react";

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
] as const;

export function HubPicker() {
  return (
    <div className="grid gap-3">
      {HUB_OPTIONS.map((option) => {
        const Icon = option.icon;

        return (
          <Link key={option.href} href={option.href} className="group block">
            <Card className="relative overflow-hidden py-0 ring-1 ring-border transition-colors duration-200 hover:border-foreground/20 hover:bg-muted/40">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  option.accent,
                )}
              />
              <CardContent className="flex items-center gap-4 py-5 pl-5 sm:py-4">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl text-white",
                    option.accent,
                  )}
                >
                  <Icon className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold tracking-tight">
                    {option.label}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>

                <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1" />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
