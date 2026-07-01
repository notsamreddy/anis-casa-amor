import Link from "next/link";
import { ChevronRight, Dumbbell, Film } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const HUB_OPTIONS = [
  {
    href: "/gym",
    label: "Gym",
    description: "Track workouts and check off exercises",
    icon: Dumbbell,
    gradient: "from-violet-600 to-indigo-600",
    glow: "shadow-violet-600/30",
  },
  {
    href: "/movies",
    label: "Watchlist",
    description: "Movies and series to watch",
    icon: Film,
    gradient: "from-fuchsia-500 to-purple-600",
    glow: "shadow-fuchsia-500/30",
  },
] as const;

export function HubPicker() {
  return (
    <div className="grid gap-3">
      {HUB_OPTIONS.map((option) => {
        const Icon = option.icon;

        return (
          <Link key={option.href} href={option.href} className="group block">
            <Card className="relative overflow-hidden py-0 ring-1 ring-foreground/10 transition-all duration-200 hover:-translate-y-0.5 hover:ring-foreground/20 active:scale-[0.99]">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b",
                  option.gradient,
                )}
              />
              <CardContent className="flex items-center gap-4 py-4 pl-5">
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                    option.gradient,
                    option.glow,
                  )}
                >
                  <Icon className="size-6" />
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
