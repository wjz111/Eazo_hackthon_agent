"use client";

import { useState, useRef } from "react";
import type { WorkoutRecord } from "@/lib/api/workout";

interface WorkoutHistoryProps {
  records: WorkoutRecord[];
  loading: boolean;
  searchQuery?: string;
  onDelete?: (id: number) => Promise<void>;
  onUpdate?: (id: number, patch: { exercise_name?: string; weight?: string; sets?: string }) => Promise<void>;
}

interface EditSheetProps {
  record: WorkoutRecord;
  onSave: (patch: { exercise_name: string; weight: string; sets: string }) => Promise<void>;
  onClose: () => void;
}

function EditSheet({ record, onSave, onClose }: EditSheetProps) {
  const [name, setName] = useState(record.exerciseName);
  const [weight, setWeight] = useState(record.weight);
  const [sets, setSets] = useState(record.sets);
  const [saving, setSaving] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ exercise_name: name.trim(), weight: weight.trim(), sets: sets.trim() });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-[rgba(26,26,26,0.45)] flex items-end"
    >
      <div className="w-full bg-[#EBEBEA] border-t-2 border-[rgba(26,26,26,0.35)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(26,26,26,0.12)]">
          <div className="flex items-center gap-2">
            <span className="w-0.5 h-4 bg-[#3A7A4A]" />
            <span className="text-[9px] tracking-widest text-[#3A7A4A] font-mono uppercase">EDIT RECORD</span>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-[#6D6D66] hover:text-[#1A1A1A]">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
              <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
            </svg>
          </button>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="border border-[rgba(26,26,26,0.25)] relative">
            <div className="absolute -top-2 left-3 bg-[#EBEBEA] px-1">
              <span className="text-[9px] tracking-widest text-[#6D6D66] font-mono uppercase">EXERCISE</span>
            </div>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm font-mono text-[#1A1A1A] bg-transparent outline-none"
              placeholder="动作名称" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 border border-[rgba(26,26,26,0.25)] relative">
              <div className="absolute -top-2 left-3 bg-[#EBEBEA] px-1">
                <span className="text-[9px] tracking-widest text-[#6D6D66] font-mono uppercase">WEIGHT</span>
              </div>
              <input type="text" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-mono text-[#3A7A4A] bg-transparent outline-none"
                placeholder="如 60kg" />
            </div>
            <div className="flex-1 border border-[rgba(26,26,26,0.25)] relative">
              <div className="absolute -top-2 left-3 bg-[#EBEBEA] px-1">
                <span className="text-[9px] tracking-widest text-[#6D6D66] font-mono uppercase">SETS</span>
              </div>
              <input type="text" value={sets} onChange={(e) => setSets(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-mono text-[#6D6D66] bg-transparent outline-none"
                placeholder="如 3*10" />
            </div>
          </div>
        </div>
        <div className="flex px-4 pb-6 pt-1 gap-2">
          <button onClick={onClose}
            className="flex-1 h-11 border border-[rgba(26,26,26,0.3)] text-[#6D6D66] text-xs font-mono font-bold tracking-widest uppercase hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors">
            CANCEL
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="flex-1 h-11 bg-[#3A7A4A] text-[#F5F5F0] text-xs font-mono font-bold tracking-widest uppercase hover:bg-[#2d5e38] transition-colors disabled:opacity-50">
            {saving ? "SAVING…" : "SAVE"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDateGroup(dateStr: string): { label: string; iso: string } {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  const iso = date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
  const label = diffDays === 0 ? "TODAY" : diffDays === 1 ? "YESTERDAY" : iso;
  return { label, iso };
}

function groupByDate(records: WorkoutRecord[]): Map<string, WorkoutRecord[]> {
  const groups = new Map<string, WorkoutRecord[]>();
  for (const r of records) {
    const d = new Date(r.workoutDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return groups;
}

export function WorkoutHistory({ records, loading, searchQuery = "", onDelete, onUpdate }: WorkoutHistoryProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingRecord, setEditingRecord] = useState<WorkoutRecord | null>(null);

  const handleDelete = async (id: number) => {
    if (!onDelete) return;
    setDeletingId(id);
    try { await onDelete(id); } finally { setDeletingId(null); }
  };

  const handleUpdate = async (patch: { exercise_name: string; weight: string; sets: string }) => {
    if (!onUpdate || !editingRecord) return;
    await onUpdate(editingRecord.indexId, patch);
  };

  if (loading) {
    return (
      <div className="px-4 space-y-0 divide-y divide-[rgba(26,26,26,0.1)]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3 opacity-40">
            <span className="text-[10px] font-mono text-[#A8A890] w-6">{String(i).padStart(2,"0")}</span>
            <span className="w-px h-6 bg-[rgba(26,26,26,0.15)] mx-2" />
            <div className="h-3 bg-[rgba(26,26,26,0.15)] rounded-none w-32 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        {/* 构成主义空状态 — 技术标注框 */}
        <div className="relative w-20 h-20 flex items-center justify-center mb-6">
          <span className="absolute inset-0 border border-[rgba(26,26,26,0.2)]" />
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#3A7A4A]" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#3A7A4A]" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#3A7A4A]" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#3A7A4A]" />
          <span className="text-xl text-[#A8A890]">○</span>
        </div>
        <p className="text-[11px] tracking-widest text-[#6D6D66] font-mono uppercase mb-1">NO RECORDS</p>
        <p className="text-xs text-[#A8A890] font-mono">点击麦克风开始记录第一次训练</p>
      </div>
    );
  }

  // 关键词过滤：匹配动作名称（不区分大小写）
  const keyword = searchQuery.trim().toLowerCase();
  const filtered = keyword
    ? records.filter((r) => r.exerciseName.toLowerCase().includes(keyword))
    : records;

  // 搜索无结果
  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="relative w-16 h-16 flex items-center justify-center mb-5">
          <span className="absolute inset-0 border border-[rgba(26,26,26,0.2)]" />
          <span className="absolute top-0 left-0 w-3 h-3 border-t border-l border-[#3A7A4A]" />
          <span className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#3A7A4A]" />
          <span className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#3A7A4A]" />
          <span className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#3A7A4A]" />
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#A8A890" strokeWidth="1.5" strokeLinecap="square">
            <circle cx="8" cy="8" r="5.5" /><line x1="12" y1="12" x2="18" y2="18" />
            <line x1="6" y1="8" x2="10" y2="8" /><line x1="8" y1="6" x2="8" y2="10" />
          </svg>
        </div>
        <p className="text-[11px] tracking-widest text-[#6D6D66] font-mono uppercase mb-1">NO RESULTS</p>
        <p className="text-xs text-[#A8A890] font-mono">未找到「{searchQuery.trim()}」相关记录</p>
      </div>
    );
  }

  const groups = groupByDate(filtered);

  return (
    <>
      <div className="pb-6">
      {Array.from(groups.entries()).map(([dateKey, items]) => {
        const { label, iso } = formatDateGroup(items[0].workoutDate);
        return (
          <div key={dateKey}>
            {/* 日期分组标题 — 技术海报横线分隔 */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[rgba(200,200,198,0.7)] border-b border-[rgba(26,26,26,0.15)] sticky top-0 z-10">
              <span className="text-[9px] tracking-[0.2em] text-[#3A7A4A] font-mono font-bold uppercase">{label}</span>
              {label !== iso && (
                <span className="text-[9px] text-[#A8A890] font-mono">{iso}</span>
              )}
              <span className="flex-1 h-px bg-[rgba(26,26,26,0.15)]" />
            </div>

            <div className="divide-y divide-[rgba(26,26,26,0.08)]">
              {items.map((record, idx) => (
                <RecordRow
                  key={record.indexId}
                  record={record}
                  idx={idx + 1}
                  deleting={deletingId === record.indexId}
                  onDelete={() => handleDelete(record.indexId)}
                  onEdit={() => setEditingRecord(record)}
                />
              ))}
            </div>
          </div>
        );
      })}
      </div>

      {editingRecord && (
        <EditSheet
          record={editingRecord}
          onSave={handleUpdate}
          onClose={() => setEditingRecord(null)}
        />
      )}
    </>
  );
}

interface RecordRowProps {
  record: WorkoutRecord;
  idx: number;
  deleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

function RecordRow({ record, idx, deleting, onDelete, onEdit }: RecordRowProps) {
  return (
    <div className="flex items-center px-4 py-3 animate-fade-in-row hover:bg-[rgba(26,26,26,0.03)] transition-colors">
      <span className="text-[10px] text-[#A8A890] font-mono w-6 flex-shrink-0 tabular-nums">
        {String(idx).padStart(2, "0")}
      </span>
      <span className="w-px h-8 bg-[rgba(26,26,26,0.15)] mx-3 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[#1A1A1A] truncate tracking-tight">{record.exerciseName}</div>
        <div className="flex items-center gap-3 mt-0.5">
          {record.weight && (
            <span className="text-[11px] text-[#3A7A4A] font-mono font-bold">{record.weight}</span>
          )}
          {record.sets && (
            <span className="text-[11px] text-[#6D6D66] font-mono">{record.sets}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
        <button onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center text-[#B0B0A8] hover:text-[#3A7A4A] transition-colors"
          aria-label="编辑">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" strokeLinejoin="miter">
            <path d="M9.5 2L12 4.5L5.5 11H3V8.5L9.5 2Z" />
            <line x1="1" y1="13" x2="13" y2="13" />
          </svg>
        </button>
        <button onClick={onDelete} disabled={deleting}
          className="w-8 h-8 flex items-center justify-center text-[#B0B0A8] hover:text-[#C0392B] transition-colors disabled:opacity-40"
          aria-label="删除">
          {deleting ? (
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" className="animate-spin">
              <path d="M6.5 1v2M6.5 10v2M1 6.5h2M10 6.5h2" />
            </svg>
          ) : (
            <svg width="13" height="14" viewBox="0 0 13 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
              <line x1="1" y1="3.5" x2="12" y2="3.5" />
              <path d="M4.5 3.5V2h4v1.5" />
              <rect x="2" y="3.5" width="9" height="9" />
              <line x1="5" y1="6.5" x2="5" y2="10" />
              <line x1="8" y1="6.5" x2="8" y2="10" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
