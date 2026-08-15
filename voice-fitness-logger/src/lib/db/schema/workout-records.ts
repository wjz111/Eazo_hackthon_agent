import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { index, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const workoutRecords = pgTable(
  "workout_records",
  {
    indexId: serial("index_id").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    workoutDate: timestamp("workout_date", { withTimezone: true }).notNull().defaultNow(),
    exerciseName: text("exercise_name").notNull(),
    weight: text("weight").notNull().default(""),
    sets: text("sets").notNull().default(""),
  },
  (table) => ({
    userDateIdx: index("idx_workout_records_user_date").on(table.userId, table.workoutDate),
  })
);

export type WorkoutRecord = InferSelectModel<typeof workoutRecords>;
export type NewWorkoutRecord = InferInsertModel<typeof workoutRecords>;
