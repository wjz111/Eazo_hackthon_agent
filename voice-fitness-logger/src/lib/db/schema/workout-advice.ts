import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { unique } from "drizzle-orm/pg-core";

export const workoutAdvice = pgTable(
  "workout_advice",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    adviceDate: date("advice_date").notNull(),
    advice: text("advice").notNull(),
    recordCount: integer("record_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateUniq: unique("workout_advice_user_date_uniq").on(table.userId, table.adviceDate),
  })
);

export type WorkoutAdvice = InferSelectModel<typeof workoutAdvice>;
export type NewWorkoutAdvice = InferInsertModel<typeof workoutAdvice>;
