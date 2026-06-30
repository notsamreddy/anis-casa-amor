import "../../load-env";

import { count } from "drizzle-orm";

import { getDb } from "@/db";
import { exercises, workoutPlans } from "@/db/schema";

const seedPlans = [
  {
    type: "push" as const,
    name: "Push Day",
    exercises: [
      { name: "Bench Press", sets: 3, reps: "8-10" },
      { name: "Overhead Press", sets: 3, reps: "8-10" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10-12" },
      { name: "Tricep Pushdowns", sets: 3, reps: "12-15" },
      { name: "Lateral Raises", sets: 3, reps: "12-15" },
    ],
  },
  {
    type: "pull" as const,
    name: "Pull Day",
    exercises: [
      { name: "Barbell Rows", sets: 3, reps: "8-10" },
      { name: "Lat Pulldown", sets: 3, reps: "10-12" },
      { name: "Face Pulls", sets: 3, reps: "15" },
      { name: "Dumbbell Curls", sets: 3, reps: "10-12" },
      { name: "Hammer Curls", sets: 3, reps: "10-12" },
    ],
  },
  {
    type: "legs" as const,
    name: "Leg Day",
    exercises: [
      { name: "Squats", sets: 3, reps: "8-10" },
      { name: "Romanian Deadlift", sets: 3, reps: "8-10" },
      { name: "Leg Press", sets: 3, reps: "10-12" },
      { name: "Leg Curl", sets: 3, reps: "12-15" },
      { name: "Calf Raises", sets: 3, reps: "15-20" },
    ],
  },
];

async function seed() {
  const [existing] = await getDb().select({ value: count() }).from(workoutPlans);

  if (existing.value > 0) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  for (const plan of seedPlans) {
    const [createdPlan] = await getDb()
      .insert(workoutPlans)
      .values({ type: plan.type, name: plan.name })
      .returning();

    await getDb().insert(exercises).values(
      plan.exercises.map((exercise, index) => ({
        planId: createdPlan.id,
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        sortOrder: index,
      })),
    );
  }

  console.log("Seed complete: Push, Pull, and Legs workouts created.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
