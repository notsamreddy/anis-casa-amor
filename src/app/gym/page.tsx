import { WorkoutPicker } from "@/components/workout-picker";

export const dynamic = "force-dynamic";

export default function GymPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Choose workout</h1>
        <p className="text-muted-foreground">What are you training today?</p>
      </section>

      <WorkoutPicker />
    </div>
  );
}
