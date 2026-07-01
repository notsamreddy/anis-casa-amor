import { redirect } from "next/navigation";

import { AdminExerciseManager } from "@/components/admin-exercise-manager";
import { AdminSoundSettings } from "@/components/admin-sound-settings";
import { isAdmin } from "@/lib/admin";
import {
  getAllExercisesGroupedByPlan,
  getExerciseSoundEnabled,
  getWorkoutPlans,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const allowed = await isAdmin();

  if (!allowed) {
    redirect("/");
  }

  const [groupedPlans, plans, soundEnabled] = await Promise.all([
    getAllExercisesGroupedByPlan(),
    getWorkoutPlans(),
    getExerciseSoundEnabled(),
  ]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage gym exercises, demo videos, and app preferences.
        </p>
      </section>

      <AdminSoundSettings soundEnabled={soundEnabled} />

      <AdminExerciseManager groupedPlans={groupedPlans} plans={plans} />
    </div>
  );
}
