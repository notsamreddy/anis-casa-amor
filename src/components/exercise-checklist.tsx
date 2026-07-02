"use client";

import { useTransition } from "react";
import { PartyPopper } from "lucide-react";

import { toggleExerciseCompletion } from "@/actions/completions";
import type { Exercise, WorkoutType } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ExerciseVideo } from "@/components/exercise-video";
import { celebrateCheckoff, celebrateWorkoutComplete } from "@/lib/confetti";
import {
  playExerciseCompleteSound,
  playWorkoutCompleteSound,
} from "@/lib/success-sound";
import { WORKOUT_THEME } from "@/lib/workout-types";
import { cn } from "@/lib/utils";

type ExerciseChecklistProps = {
  type: WorkoutType;
  exercises: Exercise[];
  completedIds: number[];
  soundEnabled: boolean;
};

export function ExerciseChecklist({
  type,
  exercises,
  completedIds,
  soundEnabled,
}: ExerciseChecklistProps) {
  const [isPending, startTransition] = useTransition();
  const completedSet = new Set(completedIds);
  const theme = WORKOUT_THEME[type];

  function handleToggle(exerciseId: number, checked: boolean) {
    if (checked) {
      const willFinish = completedSet.size + 1 >= exercises.length;
      if (soundEnabled) {
        if (willFinish) {
          playWorkoutCompleteSound();
        } else {
          playExerciseCompleteSound();
        }
      }
      if (willFinish) {
        void celebrateWorkoutComplete();
      } else {
        void celebrateCheckoff();
      }
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
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              theme.accent,
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
