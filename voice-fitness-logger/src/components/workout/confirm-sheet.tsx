"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/utils";
import type { ParsedExercise } from "@/lib/api/workout";

interface ConfirmSheetProps {
  exercises: ParsedExercise[];
  onConfirm: (exercises: ParsedExercise[]) => void;
  onCancel: () => void;
  saving: boolean;
}

export function ConfirmSheet({ exercises, onConfirm, onCancel, saving }: ConfirmSheetProps) {
  const [items, setItems] = useState<ParsedExercise[]>(exercises);

  const updateItem = (index: number, field: keyof ParsedExercise, value: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };
  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[rgba(26,26,26,0.55)]" onClick={onCancel} />

      {/* Sheet — 构成主义：直角，纸灰背景，细线描边 */}
      <div className="relative z-10 bg-[#EBEBEA] border-t-2 border-[rgba(26,26,26,0.5)] max-h-[85dvh] flex flex-col">
        {/* 标注头部 */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-[rgba(26,26,26,0.15)] relative">
          {/* 技术标注框左上角 */}
          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#3A7A4A]" />
          <div>
            <div className="text-[9px] tracking-widest text-[#3A7A4A] uppercase font-mono mb-0.5">CONFIRM RECORDS</div>
            <h2 className="text-sm font-bold text-[#1A1A1A] tracking-tight">确认训练记录</h2>
            <p className="text-[11px] text-[#6D6D66] font-mono mt-0.5">
              {String(items.length).padStart(2,"0")} ITEMS · 可修改后保存
            </p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center border border-[rgba(26,26,26,0.3)] hover:border-[rgba(26,26,26,0.6)] transition-colors"
          >
            <X className="w-4 h-4 text-[#1A1A1A]" />
          </button>
        </div>

        {/* 列表 */}
        <div className="flex-1 overflow-y-auto divide-y divide-[rgba(26,26,26,0.1)]">
          {items.map((item, idx) => (
            <ExerciseRow
              key={idx}
              idx={idx}
              item={item}
              onUpdate={(field, value) => updateItem(idx, field, value)}
              onRemove={() => removeItem(idx)}
            />
          ))}
          {items.length === 0 && (
            <div className="text-center py-10 text-[#6D6D66] text-xs font-mono">
              — 已移除全部动作 —
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 border-t border-[rgba(26,26,26,0.2)]"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
        >
          <button
            disabled={items.length === 0 || saving}
            onClick={() => onConfirm(items)}
            className={cn(
              "w-full h-12 font-bold text-sm tracking-widest uppercase font-mono transition-all duration-180",
              "flex items-center justify-center gap-2",
              items.length > 0 && !saving
                ? "bg-[#3A7A4A] text-[#F5F5F0] hover:bg-[#2d5e38]"
                : "bg-[#B4B4B2] text-[#6D6D66] cursor-not-allowed"
            )}
          >
            {saving ? "SAVING…" : `SAVE ${String(items.length).padStart(2,"0")} RECORDS`}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ExerciseRowProps {
  idx: number;
  item: ParsedExercise;
  onUpdate: (field: keyof ParsedExercise, value: string) => void;
  onRemove: () => void;
}

function ExerciseRow({ idx, item, onUpdate, onRemove }: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false);
  const dateLabel = (() => {
    try {
      return new Date(item.workout_date).toLocaleString("zh-CN", {
        month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      });
    } catch { return item.workout_date; }
  })();

  return (
    <div className="animate-fade-in-row">
      {/* 主行 — 像一张数据表格行 */}
      <div className="flex items-center gap-0 px-4 py-3">
        {/* 序号 */}
        <span className="text-[10px] text-[#A8A890] font-mono w-6 flex-shrink-0">
          {String(idx + 1).padStart(2, "0")}
        </span>
        {/* 分隔线 */}
        <span className="w-px h-8 bg-[rgba(26,26,26,0.15)] mx-3 flex-shrink-0" />
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-[#1A1A1A] truncate tracking-tight">{item.exercise_name}</div>
          <div className="flex items-center gap-3 mt-0.5">
            {item.weight && (
              <span className="text-[11px] text-[#3A7A4A] font-mono font-bold">{item.weight}</span>
            )}
            {item.sets && (
              <span className="text-[11px] text-[#6D6D66] font-mono">{item.sets}</span>
            )}
          </div>
        </div>
        {/* 操作 */}
        <div className="flex items-center gap-1 ml-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-2 h-7 text-[10px] tracking-widest text-[#6D6D66] border border-[rgba(26,26,26,0.25)] hover:border-[#3A7A4A] hover:text-[#3A7A4A] font-mono uppercase transition-colors"
          >
            {expanded ? "▲" : "▼"}
          </button>
          <button
            onClick={onRemove}
            className="px-2 h-7 text-[10px] text-[#6D6D66] border border-[rgba(26,26,26,0.25)] hover:border-red-600 hover:text-red-700 font-mono transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* 展开编辑区 */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2 border-t border-[rgba(26,26,26,0.1)] pt-3 bg-[rgba(235,235,234,0.7)]">
          {[
            { label: "EXERCISE", field: "exercise_name" as const, value: item.exercise_name, ph: "动作名称" },
            { label: "WEIGHT  ", field: "weight" as const, value: item.weight, ph: "如 6kg、100lb" },
            { label: "SETS    ", field: "sets" as const, value: item.sets, ph: "如 3*10、2*12和2*10" },
          ].map(({ label, field, value, ph }) => (
            <div key={field} className="flex items-center gap-2">
              <span className="text-[10px] tracking-widest text-[#A8A890] font-mono w-20 flex-shrink-0">{label}</span>
              <span className="text-[#A8A890] font-mono text-xs mr-1">›</span>
              <input
                type="text"
                value={value}
                onChange={(e) => onUpdate(field, e.target.value)}
                placeholder={ph}
                className="flex-1 bg-transparent border-b border-[rgba(26,26,26,0.3)] focus:border-[#3A7A4A] focus:outline-none text-sm text-[#1A1A1A] font-mono pb-0.5 placeholder:text-[#A8A890]"
              />
            </div>
          ))}
          <div className="text-[10px] text-[#A8A890] font-mono pt-1">
            DATETIME › {dateLabel}
          </div>
        </div>
      )}
    </div>
  );
}
