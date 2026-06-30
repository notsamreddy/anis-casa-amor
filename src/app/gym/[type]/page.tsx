import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Dumbbell } from "lucide-react";

import { ExerciseChecklist } from "@/components/exercise-checklist";
import {
  getCompletedExerciseIds,
  getExercisesByType,
  getWorkoutPlanByType,
} from "@/lib/queries";
import {
  WORKOUT_DESCRIPTIONS,
  WORKOUT_LABELS,
  WORKOUT_THEME,
  isWorkoutType,
} from "@/lib/workout-types";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type WorkoutPageProps = {
  params: Promise<{ type: string }>;
};

export default async function WorkoutPage({ params }: WorkoutPageProps) {
  const { type } = await params;

  if (!isWorkoutType(type)) {
    notFound();
  }

  const { userId } = await auth();
  if (!userId) {
    notFound();
  }

  const plan = await getWorkoutPlanByType(type);
  const exercises = await getExercisesByType(type);
  const completedIds = await getCompletedExerciseIds(
    userId,
    exercises.map((exercise) => exercise.id),
  );
  const theme = WORKOUT_THEME[type];

  return (
    <div className="space-y-6">
      <Link
        href="/gym"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-ml-2",
        )}
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
            theme.gradient,
            theme.glow,
          )}
        >
          <Dumbbell className="size-7" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {plan?.name ?? WORKOUT_LABELS[type]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {WORKOUT_DESCRIPTIONS[type]}
          </p>
        </div>
      </div>

      <ExerciseChecklist
        type={type}
        exercises={exercises}
        completedIds={[...completedIds]}
      />
    </div>
  );
}
