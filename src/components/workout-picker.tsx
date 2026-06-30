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
            <Card className="relative overflow-hidden py-0 ring-1 ring-foreground/10 transition-all duration-200 hover:-translate-y-0.5 hover:ring-foreground/20 active:scale-[0.99]">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b",
                  theme.gradient,
                )}
              />
              <CardContent className="flex items-center gap-4 py-4 pl-5">
                <div
                  className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                    theme.gradient,
                    theme.glow,
                  )}
                >
                  <Dumbbell className="size-6" />
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
