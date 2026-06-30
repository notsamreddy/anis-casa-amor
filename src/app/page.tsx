import { WorkoutPicker } from "@/components/workout-picker";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Choose your workout
          </h2>
          <span className="text-xs text-muted-foreground">3 splits</span>
        </div>
        <WorkoutPicker />
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Your check-offs are saved for today and reset tomorrow.
      </p>
    </div>
  );
}
