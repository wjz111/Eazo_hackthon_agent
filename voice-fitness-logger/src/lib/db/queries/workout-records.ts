import { db } from "@/lib/db/client";
import { workoutRecords, type NewWorkoutRecord, type WorkoutRecord } from "@/lib/db/schema/workout-records";
import { desc, eq, and } from "drizzle-orm";

/** Insert a new workout record. workout_date must be <= NOW() — validated at API level. */
export async function createWorkoutRecord(
  data: Omit<NewWorkoutRecord, "indexId" | "createdAt">
): Promise<WorkoutRecord> {
  const [record] = await db
    .insert(workoutRecords)
    .values(data)
    .returning();
  return record;
}

/** Return all records for a user ordered by workout_date desc. */
export async function listWorkoutRecords(userId: string): Promise<WorkoutRecord[]> {
  return db
    .select()
    .from(workoutRecords)
    .where(eq(workoutRecords.userId, userId))
    .orderBy(desc(workoutRecords.workoutDate));
}

/** Delete a record by id, scoped to userId. Returns true if deleted. */
export async function deleteWorkoutRecord(userId: string, id: number): Promise<boolean> {
  const result = await db
    .delete(workoutRecords)
    .where(and(eq(workoutRecords.indexId, id), eq(workoutRecords.userId, userId)))
    .returning();
  return result.length > 0;
}

/** Update exercise_name / weight / sets of a record, scoped to userId. */
export async function updateWorkoutRecord(
  userId: string,
  id: number,
  patch: { exerciseName?: string; weight?: string; sets?: string }
): Promise<WorkoutRecord | undefined> {
  const [updated] = await db
    .update(workoutRecords)
    .set(patch)
    .where(and(eq(workoutRecords.indexId, id), eq(workoutRecords.userId, userId)))
    .returning();
  return updated;
}
