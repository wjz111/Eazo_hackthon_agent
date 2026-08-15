"use client";

import type { WorkoutRecord } from "@/lib/api/workout";

interface TodayStatsProps {
  records: WorkoutRecord[];
}

export function TodayStats({ records }: TodayStatsProps) {
  const today = new Date();
  const todayRecords = records.filter((r) => {
    const d = new Date(r.workoutDate);
    return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  });

  const totalSets = todayRecords.length;
  const uniqueExercises = new Set(todayRecords.map((r) => r.exerciseName)).size;

  if (totalSets === 0) return null;

  return (
    /* 构成主义数据面板 — 边框标注框 + 等宽数字 */
    <div className="mx-4 mb-3 border border-[rgba(26,26,26,0.3)] relative">
      {/* 标注标题 */}
      <div className="absolute -top-2.5 left-3 bg-[#EBEBEA] px-1">
        <span className="text-[9px] tracking-widest text-[#3A7A4A] font-mono uppercase">TODAY</span>
      </div>
      {/* 四角 */}
      <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-[#3A7A4A]" />
      <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-[#3A7A4A]" />
      <span className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-[#3A7A4A]" />
      <span className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-[#3A7A4A]" />

      <div className="flex divide-x divide-[rgba(26,26,26,0.15)] px-1 py-2">
        <div className="flex-1 flex flex-col items-center py-1">
          <span className="text-3xl font-bold text-[#1A1A1A] tabular-nums font-mono leading-none">{String(totalSets).padStart(2,"0")}</span>
          <span className="text-[9px] tracking-widest text-[#6D6D66] font-mono mt-1 uppercase">RECORDS</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-1">
          <span className="text-3xl font-bold text-[#3A7A4A] tabular-nums font-mono leading-none">{String(uniqueExercises).padStart(2,"0")}</span>
          <span className="text-[9px] tracking-widest text-[#6D6D66] font-mono mt-1 uppercase">EXERCISES</span>
        </div>
      </div>
    </div>
  );
}
