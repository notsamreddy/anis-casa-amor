import { redirect } from "next/navigation";

import { AdminExerciseManager } from "@/components/admin-exercise-manager";
import { isAdmin } from "@/lib/admin";
import { getAllExercisesGroupedByPlan, getWorkoutPlans } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const allowed = await isAdmin();

  if (!allowed) {
    redirect("/");
  }

  const [groupedPlans, plans] = await Promise.all([
    getAllExercisesGroupedByPlan(),
    getWorkoutPlans(),
  ]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Coach settings</h1>
        <p className="text-muted-foreground">
          Manage the exercise list and demo video links for each workout.
        </p>
      </section>

      <AdminExerciseManager groupedPlans={groupedPlans} plans={plans} />
    </div>
  );
}
