import { request } from "@/lib/api/request";

export interface ParsedExercise {
  exercise_name: string;
  weight: string;
  sets: string;
  workout_date: string;
}

export interface WorkoutRecord {
  indexId: number;
  userId: string;
  createdAt: string;
  workoutDate: string;
  exerciseName: string;
  weight: string;
  sets: string;
}

/** Ask AI to parse a voice transcript into structured exercises */
export async function parseWorkout(text: string): Promise<ParsedExercise[]> {
  const res = await request("/api/workout/parse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Parse failed");
  }
  const data = await res.json();
  return data.exercises ?? [];
}

/** Save confirmed exercises to the database */
export async function saveWorkout(exercises: ParsedExercise[]): Promise<WorkoutRecord[]> {
  const res = await request("/api/workout/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exercises }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Save failed");
  }
  const data = await res.json();
  return data.saved ?? [];
}

/** Fetch all workout records for current user, ordered by workout_date desc */
export async function fetchWorkoutList(): Promise<WorkoutRecord[]> {
  const res = await request("/api/workout/list");
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "List failed");
  }
  const data = await res.json();
  return data.records ?? [];
}

/** Fetch today's AI-generated advice (cached per day, refreshed on new records) */
export async function fetchDailyAdvice(): Promise<string> {
  const res = await request("/api/workout/advice");
  const data = await res.json().catch(() => ({}));
  if (data.advice) return data.advice as string;
  throw new Error("No advice returned");
}

/** Delete a workout record by id */
export async function deleteWorkout(id: number): Promise<void> {
  const res = await request(`/api/workout/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Delete failed");
  }
}

/** Update exercise_name / weight / sets of a record */
export async function updateWorkout(
  id: number,
  patch: { exercise_name?: string; weight?: string; sets?: string }
): Promise<WorkoutRecord> {
  const res = await request(`/api/workout/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Update failed");
  }
  const data = await res.json();
  return data.record;
}
