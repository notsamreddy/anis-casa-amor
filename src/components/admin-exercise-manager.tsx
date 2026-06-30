"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";

import {
  createExercise,
  deleteExercise,
  moveExercise,
  updateExercise,
  type ExerciseInput,
} from "@/actions/exercises";
import type { Exercise, WorkoutPlan } from "@/db/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type PlanWithExercises = {
  plan: WorkoutPlan;
  exercises: Exercise[];
};

type ExerciseFormProps = {
  plans: WorkoutPlan[];
  initial?: Exercise;
  defaultPlanId?: number;
  onSuccess: () => void;
};

function ExerciseForm({
  plans,
  initial,
  defaultPlanId,
  onSuccess,
}: ExerciseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [planId, setPlanId] = useState(
    String(initial?.planId ?? defaultPlanId ?? plans[0]?.id ?? ""),
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [sets, setSets] = useState(String(initial?.sets ?? 3));
  const [reps, setReps] = useState(initial?.reps ?? "8-10");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const input: ExerciseInput = {
      planId: Number(planId),
      name,
      sets: Number(sets),
      reps,
      notes,
      videoUrl,
    };

    startTransition(async () => {
      if (initial) {
        await updateExercise(initial.id, input);
      } else {
        await createExercise(input);
      }
      onSuccess();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="plan">Workout</Label>
        <Select
          value={planId}
          onValueChange={(value) => value && setPlanId(value)}
        >
          <SelectTrigger id="plan">
            <SelectValue placeholder="Select workout" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={String(plan.id)}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Exercise name</Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="sets">Sets</Label>
          <Input
            id="sets"
            type="number"
            min={1}
            value={sets}
            onChange={(event) => setSets(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reps">Reps</Label>
          <Input
            id="reps"
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            placeholder="8-10"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoUrl">Demo video URL</Label>
        <Input
          id="videoUrl"
          type="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder="https://youtube.com/..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Form cues, rest time, etc."
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : initial ? "Update exercise" : "Add exercise"}
      </Button>
    </form>
  );
}

type AdminExerciseManagerProps = {
  groupedPlans: PlanWithExercises[];
  plans: WorkoutPlan[];
};

export function AdminExerciseManager({
  groupedPlans,
  plans,
}: AdminExerciseManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  function handleDelete(id: number) {
    if (!confirm("Delete this exercise?")) {
      return;
    }

    startTransition(async () => {
      await deleteExercise(id);
    });
  }

  function handleMove(id: number, direction: "up" | "down") {
    startTransition(async () => {
      await moveExercise(id, direction);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Manage exercises</h2>
          <p className="text-sm text-muted-foreground">
            Add, edit, or remove exercises and demo videos.
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="size-4" />
            Add
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add exercise</DialogTitle>
            </DialogHeader>
            <ExerciseForm
              plans={plans}
              onSuccess={() => setAddOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {groupedPlans.map(({ plan, exercises: planExercises }) => (
        <Card key={plan.id}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>
              {planExercises.length} exercise
              {planExercises.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {planExercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exercises in this workout yet.
              </p>
            ) : (
              planExercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium">{exercise.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {exercise.sets} × {exercise.reps}
                      {exercise.videoUrl ? " · has demo video" : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending || index === 0}
                      onClick={() => handleMove(exercise.id, "up")}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={
                        isPending || index === planExercises.length - 1
                      }
                      onClick={() => handleMove(exercise.id, "down")}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingExercise(exercise)}
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isPending}
                      onClick={() => handleDelete(exercise.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ))}

      <Dialog
        open={editingExercise !== null}
        onOpenChange={(open) => !open && setEditingExercise(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit exercise</DialogTitle>
          </DialogHeader>
          {editingExercise && (
            <ExerciseForm
              plans={plans}
              initial={editingExercise}
              onSuccess={() => setEditingExercise(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
