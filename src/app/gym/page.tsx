import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { WorkoutPicker } from "@/components/workout-picker";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function GymPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "-ml-2",
        )}
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <section className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Choose workout</h1>
        <p className="text-muted-foreground">What are you training today?</p>
      </section>

      <WorkoutPicker />

      <p className="text-center text-xs text-muted-foreground">
        Your check-offs are saved for today and reset tomorrow.
      </p>
    </div>
  );
}
