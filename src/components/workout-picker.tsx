import Link from "next/link";
import { ChevronRight, Dumbbell } from "lucide-react";

import {
  WORKOUT_DESCRIPTIONS,
  WORKOUT_LABELS,
  WORKOUT_THEME,
  WORKOUT_TYPES,
} from "@/lib/workout-types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function WorkoutPicker() {
  return (
    <div className="grid gap-3">
      {WORKOUT_TYPES.map((type) => {
        const theme = WORKOUT_THEME[type];

        return (
          <Link key={type} href={`/gym/${type}`} className="group block">
            <Card className="relative overflow-hidden py-0 ring-1 ring-border transition-colors duration-200 hover:border-foreground/20 hover:bg-muted/40">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1",
                  theme.accent,
                )}
              />
              <CardContent className="flex items-center gap-4 py-5 pl-5 sm:py-4">
                <div
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl text-white",
                    theme.accent,
                  )}
                >
                  <Dumbbell className="size-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold tracking-tight">
                    {WORKOUT_LABELS[type]}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {WORKOUT_DESCRIPTIONS[type]}
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
