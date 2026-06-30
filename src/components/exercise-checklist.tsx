"use client";

import { useTransition } from "react";
import { PartyPopper } from "lucide-react";

import { toggleExerciseCompletion } from "@/actions/completions";
import type { Exercise, WorkoutType } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ExerciseVideo } from "@/components/exercise-video";
import { WORKOUT_THEME } from "@/lib/workout-types";
import { cn } from "@/lib/utils";

type ExerciseChecklistProps = {
  type: WorkoutType;
  exercises: Exercise[];
  completedIds: number[];
};

const CONFETTI_COLORS = [
  "#8b5cf6",
  "#f97316",
  "#0ea5e9",
  "#10b981",
  "#f43f5e",
  "#facc15",
];

function originFromElement(el: HTMLElement | null) {
  if (!el || typeof window === "undefined") {
    return { x: 0.5, y: 0.6 };
  }
  const rect = el.getBoundingClientRect();
  return {
    x: (rect.left + rect.width / 2) / window.innerWidth,
    y: (rect.top + rect.height / 2) / window.innerHeight,
  };
}

async function fireConfetti(target: HTMLElement | null, big: boolean) {
  if (
    typeof window === "undefined" ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  const confetti = (await import("canvas-confetti")).default;
  const origin = originFromElement(target);

  confetti({
    particleCount: big ? 220 : 110,
    spread: big ? 140 : 90,
    startVelocity: big ? 60 : 48,
    origin,
    colors: CONFETTI_COLORS,
    scalar: big ? 1.3 : 1.15,
    gravity: 0.9,
    ticks: big ? 260 : 200,
    zIndex: 9999,
    disableForReducedMotion: true,
  });

  if (big) {
    const sideShot = (angle: number, x: number) =>
      confetti({
        particleCount: 120,
        angle,
        spread: 80,
        startVelocity: 65,
        origin: { x, y: 0.75 },
        colors: CONFETTI_COLORS,
        scalar: 1.2,
        ticks: 260,
        zIndex: 9999,
        disableForReducedMotion: true,
      });
    setTimeout(() => sideShot(60, 0), 150);
    setTimeout(() => sideShot(120, 1), 150);
  }
}

export function ExerciseChecklist({
  type,
  exercises,
  completedIds,
}: ExerciseChecklistProps) {
  const [isPending, startTransition] = useTransition();
  const completedSet = new Set(completedIds);
  const theme = WORKOUT_THEME[type];

  function handleToggle(exerciseId: number, checked: boolean) {
    if (checked) {
      const willFinish = completedSet.size + 1 >= exercises.length;
      const target = document.getElementById(`exercise-${exerciseId}`);
      void fireConfetti(target, willFinish);
    }

    startTransition(async () => {
      await toggleExerciseCompletion(exerciseId, checked);
    });
  }

  if (exercises.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No exercises yet. Ask your coach to add some in admin settings.
        </CardContent>
      </Card>
    );
  }

  const completedCount = exercises.filter((exercise) =>
    completedSet.has(exercise.id),
  ).length;
  const total = exercises.length;
  const percent = Math.round((completedCount / total) * 100);
  const allDone = completedCount === total;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {completedCount} of {total} done
          </span>
          <span className="tabular-nums text-muted-foreground">
            {isPending ? "Saving…" : `${percent}%`}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
              theme.gradient,
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {allDone && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl p-4 text-sm font-medium ring-1 ring-foreground/10",
            theme.tint,
          )}
        >
          <PartyPopper className="size-5 shrink-0" />
          <span>Workout complete — nice work! See you next time.</span>
        </div>
      )}

      <div className="space-y-3">
        {exercises.map((exercise) => {
          const isCompleted = completedSet.has(exercise.id);

          return (
            <Card
              key={exercise.id}
              className={cn(
                "py-0 transition-colors",
                isCompleted && theme.tint,
              )}
            >
              <CardContent className="flex items-start gap-3.5 p-4">
                <Checkbox
                  id={`exercise-${exercise.id}`}
                  checked={isCompleted}
                  disabled={isPending}
                  className="mt-0.5 size-6"
                  onCheckedChange={(checked) =>
                    handleToggle(exercise.id, checked === true)
                  }
                />

                <div className="min-w-0 flex-1 space-y-2.5">
                  <label
                    htmlFor={`exercise-${exercise.id}`}
                    className={cn(
                      "block cursor-pointer text-base font-semibold tracking-tight transition-colors",
                      isCompleted && "text-muted-foreground line-through",
                    )}
                  >
                    {exercise.name}
                  </label>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-medium">
                      {exercise.sets} × {exercise.reps}
                    </Badge>
                    {exercise.videoUrl && (
                      <ExerciseVideo
                        url={exercise.videoUrl}
                        name={exercise.name}
                        chipClassName={theme.chip}
                      />
                    )}
                  </div>

                  {exercise.notes && (
                    <p className="text-sm text-muted-foreground">
                      {exercise.notes}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
