"use client";

import { useTransition } from "react";
import { Volume2, VolumeX } from "lucide-react";

import { updateExerciseSoundEnabled } from "@/actions/settings";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type AdminSoundSettingsProps = {
  soundEnabled: boolean;
};

export function AdminSoundSettings({ soundEnabled }: AdminSoundSettingsProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    startTransition(async () => {
      await updateExerciseSoundEnabled(checked);
    });
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
          {soundEnabled ? (
            <Volume2 className="size-5 text-primary" />
          ) : (
            <VolumeX className="size-5 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <Checkbox
              id="exercise-sound"
              checked={soundEnabled}
              disabled={isPending}
              className="size-5"
              onCheckedChange={(checked) => handleToggle(checked === true)}
            />
            <Label htmlFor="exercise-sound" className="cursor-pointer font-medium">
              Play sound on exercise check-off
            </Label>
          </div>
          <p className="text-sm text-muted-foreground">
            {isPending
              ? "Saving…"
              : soundEnabled
                ? "A short chime plays when an exercise is completed."
                : "Sounds are off for everyone."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
