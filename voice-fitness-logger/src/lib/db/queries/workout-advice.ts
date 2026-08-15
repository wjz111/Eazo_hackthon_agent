import { db } from "@/lib/db/client";
import { workoutAdvice } from "@/lib/db/schema/workout-advice";
import { and, eq } from "drizzle-orm";
import type { WorkoutAdvice } from "@/lib/db/schema/workout-advice";

/** 获取某用户某天的建议缓存 */
export async function getAdviceForDate(
  userId: string,
  date: string // "YYYY-MM-DD"
): Promise<WorkoutAdvice | undefined> {
  const rows = await db
    .select()
    .from(workoutAdvice)
    .where(and(eq(workoutAdvice.userId, userId), eq(workoutAdvice.adviceDate, date)))
    .limit(1);
  return rows[0];
}

/** 插入或覆盖某天的建议（upsert） */
export async function upsertAdvice(
  userId: string,
  date: string,
  advice: string,
  recordCount: number
): Promise<WorkoutAdvice> {
  const [row] = await db
    .insert(workoutAdvice)
    .values({ userId, adviceDate: date, advice, recordCount })
    .onConflictDoUpdate({
      target: [workoutAdvice.userId, workoutAdvice.adviceDate],
      set: { advice, recordCount, createdAt: new Date() },
    })
    .returning();
  return row;
}
