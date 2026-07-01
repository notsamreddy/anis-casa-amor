import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  unique,
} from "drizzle-orm/pg-core";

export const workoutTypeEnum = pgEnum("workout_type", ["push", "pull", "legs"]);
export const mediaTypeEnum = pgEnum("media_type", ["movie", "series"]);
export const mediaPriorityEnum = pgEnum("media_priority", [
  "high",
  "medium",
  "low",
]);

export const workoutPlans = pgTable("workout_plans", {
  id: serial("id").primaryKey(),
  type: workoutTypeEnum("type").notNull().unique(),
  name: text("name").notNull(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id")
    .notNull()
    .references(() => workoutPlans.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sets: integer("sets").notNull(),
  reps: text("reps").notNull(),
  notes: text("notes"),
  videoUrl: text("video_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const exerciseCompletions = pgTable(
  "exercise_completions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    exerciseId: integer("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    completedDate: date("completed_date").notNull(),
  },
  (table) => [unique().on(table.userId, table.exerciseId, table.completedDate)],
);

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const movies = pgTable("movies", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull().default("movie"),
  priority: mediaPriorityEnum("priority").notNull().default("medium"),
  completed: boolean("completed").notNull().default(false),
});

export type WorkoutType = (typeof workoutTypeEnum.enumValues)[number];
export type MediaType = (typeof mediaTypeEnum.enumValues)[number];
export type MediaPriority = (typeof mediaPriorityEnum.enumValues)[number];
export type WorkoutPlan = typeof workoutPlans.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type ExerciseCompletion = typeof exerciseCompletions.$inferSelect;
export type Movie = typeof movies.$inferSelect;
