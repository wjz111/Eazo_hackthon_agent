import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { listWorkoutRecords } from "@/lib/db/queries/workout-records";

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const records = await listWorkoutRecords(auth.user.id);
  return NextResponse.json({ records });
}
