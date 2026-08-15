import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createWorkoutRecord } from "@/lib/db/queries/workout-records";

interface SaveItem {
  exercise_name: string;
  weight: string;
  sets: string;
  workout_date: string;
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  let items: SaveItem[];
  try {
    const body = await request.json();
    items = Array.isArray(body.exercises) ? body.exercises : [];
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json({ error: "No exercises to save" }, { status: 400 });
  }

  const now = new Date();
  const saved = [];

  for (const item of items) {
    if (!item.exercise_name?.trim()) continue;

    // Validate workout_date — must not be in the future
    let workoutDate: Date;
    try {
      workoutDate = new Date(item.workout_date);
      if (isNaN(workoutDate.getTime())) workoutDate = now;
    } catch {
      workoutDate = now;
    }

    // Reject future dates
    if (workoutDate.getTime() > now.getTime() + 60_000) {
      return NextResponse.json(
        { error: "训练日期不能晚于当前时间" },
        { status: 422 }
      );
    }

    const record = await createWorkoutRecord({
      userId: auth.user.id,
      workoutDate,
      exerciseName: item.exercise_name.trim(),
      weight: item.weight?.trim() ?? "",
      sets: item.sets?.trim() ?? "",
    });

    saved.push(record);
  }

  return NextResponse.json({ saved });
}
