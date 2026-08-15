"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { memory } from "@eazo/sdk";
import { MicButton, type RecordState } from "@/components/workout/mic-button";
import { WaveVisualizer } from "@/components/workout/wave-visualizer";
import { ConfirmSheet } from "@/components/workout/confirm-sheet";
import { WorkoutHistory } from "@/components/workout/workout-history";
import { DailyAdvice } from "@/components/workout/daily-advice";
import { parseWorkout, saveWorkout, fetchWorkoutList, deleteWorkout, updateWorkout } from "@/lib/api/workout";
import type { ParsedExercise, WorkoutRecord } from "@/lib/api/workout";
import { AppAIClientUnavailableError } from "@/lib/api/app-ai-request";
import { cn } from "@/utils/utils";

type View = "record" | "history";

interface RecordViewProps {
  state: RecordState;
  transcript: string;
  interimText: string;
  onTranscript: (t: string) => void;
  onInterim: (t: string) => void;
  onError: (msg: string) => void;
}

export function WorkoutApp() {
  const user = useEazo((s) => s.auth.user);
  const authLoading = useEazo((s) => s.auth.loading);
  const [view, setView] = useState<View>("record");
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [parsedExercises, setParsedExercises] = useState<ParsedExercise[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [adviceRefreshKey, setAdviceRefreshKey] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) loadHistory(); }, [user]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try { setRecords(await fetchWorkoutList()); } catch { /* silent */ } finally { setHistoryLoading(false); }
  };

  const handleTranscript = useCallback(async (text: string) => {
    setInterimText(""); // clear live display
    if (!text) { toast.error("没有识别到内容，请重试"); return; }
    setTranscript(text);
    setRecordState("processing");
    try {
      const exercises = await parseWorkout(text);
      if (!exercises || exercises.length === 0) {
        toast.error("未识别到有效训练动作，请描述具体的训练内容");
        setRecordState("idle");
        return;
      }
      setParsedExercises(exercises);
    } catch (err) {
      if (!(err instanceof AppAIClientUnavailableError)) toast.error("AI 解析失败，请重试");
    } finally { setRecordState("idle"); }
  }, []);

  const handleConfirm = async (exercises: ParsedExercise[]) => {
    setSaving(true);
    try {
      await saveWorkout(exercises);
      toast.success(`已保存 ${exercises.length} 条训练记录`);
      memory.reportAction({ content: `用户记录了 ${exercises.length} 个训练动作: ${exercises.map((e) => e.exercise_name).join(", ")}`, event_type: "create" }).catch(() => {});
      setParsedExercises(null); setTranscript("");
      await loadHistory(); setView("history");
      setAdviceRefreshKey((k) => k + 1);
    } catch (err) { toast.error(err instanceof Error ? err.message : "保存失败"); }
    finally { setSaving(false); }
  };

  const handleCancel = () => { setParsedExercises(null); setTranscript(""); setInterimText(""); setRecordState("idle"); };

  const handleDeleteRecord = async (id: number) => {
    await deleteWorkout(id);
    setRecords((prev) => prev.filter((r) => r.indexId !== id));
    toast.success("已删除");
  };

  const handleUpdateRecord = async (id: number, patch: { exercise_name?: string; weight?: string; sets?: string }) => {
    const updated = await updateWorkout(id, patch);
    setRecords((prev) => prev.map((r) => r.indexId === id ? { ...r, exerciseName: updated.exerciseName, weight: updated.weight, sets: updated.sets } : r));
    toast.success("已更新");
  };

  /* ── Auth gate ── */
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-[#EBEBEA]">
        <div className="relative w-12 h-12">
          <span className="absolute inset-0 border border-[rgba(26,26,26,0.2)]" />
          <span className="absolute inset-0 border-t-2 border-[#3A7A4A] animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh bg-[#EBEBEA] px-6 text-center">
        {/* 构成主义登录页 */}
        <div className="relative w-20 h-20 flex items-center justify-center mb-8">
          <span className="absolute inset-0 border-2 border-[rgba(26,26,26,0.3)]" />
          <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#3A7A4A]" />
          <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#3A7A4A]" />
          <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#3A7A4A]" />
          <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#3A7A4A]" />
          <svg className="w-9 h-9 text-[#1A1A1A]" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
            <rect x="12" y="3" width="12" height="18" />
            <path d="M6 18 C6 27 30 27 30 18" fill="none"/>
            <line x1="18" y1="27" x2="18" y2="33"/>
            <line x1="11" y1="33" x2="25" y2="33"/>
          </svg>
        </div>
        <div className="text-[9px] tracking-[0.3em] text-[#3A7A4A] font-mono uppercase mb-1">VOICE FITNESS LOG</div>
        <h1 className="text-2xl font-bold text-[#1A1A1A] tracking-tight mb-1">声训</h1>
        <p className="text-xs text-[#6D6D66] font-mono mb-10">语音记录每一次训练</p>
        <button
          onClick={() => auth.login().catch(() => undefined)}
          className="w-full max-w-xs h-12 bg-[#1A1A1A] text-white font-bold tracking-widest text-sm uppercase font-mono hover:bg-[#3A7A4A] transition-colors"
        >
          LOGIN TO START
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-[#EBEBEA] select-none">
      {/* Header — 构成主义横栏 */}
      <header
        className="flex-shrink-0 bg-[#EBEBEA] border-b-2 border-[rgba(26,26,26,0.35)]"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        {/* 主行：logo + 操作区 */}
        <div className="flex items-center justify-between px-4 pb-3">
          <div>
            <div className="text-[9px] tracking-[0.25em] text-[#3A7A4A] font-mono uppercase leading-none mb-0.5">VOICE FITNESS LOG</div>
            <h1 className="text-base font-bold text-[#1A1A1A] tracking-tight font-mono">声训</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* 搜索图标按钮 — 仅在 LOG 页显示 */}
            {view === "history" && (
              <button
                onClick={() => {
                  setSearchOpen((v) => {
                    if (!v) setTimeout(() => searchInputRef.current?.focus(), 30);
                    else setSearchQuery("");
                    return !v;
                  });
                }}
                className={cn(
                  "w-8 h-8 flex items-center justify-center border transition-colors",
                  searchOpen
                    ? "border-[#3A7A4A] text-[#3A7A4A] bg-[rgba(58,122,74,0.08)]"
                    : "border-[rgba(26,26,26,0.3)] text-[#6D6D66] hover:border-[#3A7A4A] hover:text-[#3A7A4A]"
                )}
                aria-label="搜索动作"
              >
                {searchOpen ? (
                  /* × 关闭图标 */
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
                    <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
                  </svg>
                ) : (
                  /* 搜索图标 */
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
                    <circle cx="5.5" cy="5.5" r="4" /><line x1="8.5" y1="8.5" x2="13" y2="13" />
                  </svg>
                )}
              </button>
            )}
            {/* 用户头像 — 直角方形 */}
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name || ""} className="w-8 h-8 object-cover border border-[rgba(26,26,26,0.3)]" />
            ) : (
              <div className="w-8 h-8 border border-[rgba(26,26,26,0.3)] flex items-center justify-center bg-[rgba(58,122,74,0.1)]">
                <span className="text-xs font-bold text-[#3A7A4A] font-mono">
                  {(user.name || user.email || "?")[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 搜索展开行 */}
        {view === "history" && searchOpen && (
          <div className="px-4 pb-3 flex items-center gap-2 border-t border-[rgba(26,26,26,0.12)] pt-2.5">
            <span className="text-[9px] tracking-widest text-[#3A7A4A] font-mono uppercase flex-shrink-0">SEARCH</span>
            <span className="w-px h-4 bg-[rgba(26,26,26,0.2)] flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入动作名称…"
              className="flex-1 bg-transparent text-xs font-mono text-[#1A1A1A] placeholder-[#A8A890] outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[#A8A890] hover:text-[#6D6D66] flex-shrink-0"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square">
                  <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
                </svg>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Tab bar — 直角切换 */}
      <div className="flex border-b border-[rgba(26,26,26,0.2)] flex-shrink-0">
        {(["record", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setView(tab);
              if (tab === "record") { setSearchOpen(false); setSearchQuery(""); }
            }}
            className={cn(
              "flex-1 h-10 text-xs font-bold tracking-widest uppercase font-mono transition-all duration-180",
              view === tab
                ? "bg-[#3A7A4A] text-[#F5F5F0] border-b-2 border-[#3A7A4A]"
                : "text-[#6D6D66] hover:text-[#1A1A1A] border-b-2 border-transparent"
            )}
          >
            {tab === "record" ? "● REC" : "▤ LOG"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {view === "record" ? (
          <RecordView
            state={recordState}
            transcript={transcript}
            interimText={interimText}
            onTranscript={handleTranscript}
            onInterim={setInterimText}
            onError={(msg) => toast.error(msg)}
          />
        ) : (
          <>
            <div className="pt-4 pb-2"><DailyAdvice refreshKey={adviceRefreshKey} /></div>
            <WorkoutHistory records={records} loading={historyLoading} searchQuery={searchQuery} onDelete={handleDeleteRecord} onUpdate={handleUpdateRecord} />
          </>
        )}
      </div>

      {/* Confirm sheet */}
      {parsedExercises && (
        <ConfirmSheet exercises={parsedExercises} onConfirm={handleConfirm} onCancel={handleCancel} saving={saving} />
      )}
    </div>
  );
}

function RecordView({ state, transcript, interimText, onTranscript, onInterim, onError }: RecordViewProps) {
  const isActive = state === "recording" || (!transcript && interimText.length > 0);
  const isProcessing = state === "processing";
  // Live text: show interim while recording, final transcript after done
  const liveText = interimText || transcript;

  return (
    <div className="flex flex-col items-center px-6 pt-10 pb-8">
      {/* 状态标注文字 */}
      <div className="self-start mb-6 border-l-2 border-[#3A7A4A] pl-3">
        <div className="text-[9px] tracking-widest text-[#3A7A4A] font-mono uppercase">STATUS</div>
        <div className="text-sm text-[#1A1A1A] font-mono mt-0.5">
          {isProcessing ? "AI PARSING…" : isActive ? "RECORDING…" : "STANDBY"}
        </div>
      </div>

      {/* 麦克风按钮 */}
      <MicButton state={state} onToggle={onTranscript} onError={onError} onInterim={onInterim} />

      {/* 波形可视化 */}
      <div className="mt-4">
        <WaveVisualizer active={isActive} />
      </div>

      {/* 实时转写 / 最终结果 */}
      {liveText && (
        <div className="mt-8 w-full border border-[rgba(26,26,26,0.25)] relative animate-fade-in-row">
          <div className="absolute -top-2.5 left-3 bg-[#EBEBEA] px-1">
            <span className="text-[9px] tracking-widest text-[#3A7A4A] font-mono uppercase">
              {interimText && !isProcessing ? "LIVE ●" : "TRANSCRIPT"}
            </span>
          </div>
          <p className="text-xs font-mono leading-relaxed px-4 py-3 text-[#1A1A1A] break-words">
            {liveText}
            {interimText && !isProcessing && (
              <span className="inline-block w-0.5 h-3 bg-[#3A7A4A] ml-0.5 animate-blink align-middle" />
            )}
          </p>
        </div>
      )}

      {/* 提示示例 */}
      {!transcript && !isActive && !isProcessing && (
        <div className="mt-10 w-full space-y-0 border border-[rgba(26,26,26,0.18)]">
          <div className="px-3 py-1.5 border-b border-[rgba(26,26,26,0.1)]">
            <span className="text-[9px] tracking-widest text-[#3A7A4A] font-mono uppercase">EXAMPLES</span>
          </div>
          {[
            "昨天练了卧推三组，每组十个，80公斤",
            "哑铃推肩四组，两组十二个和两组十个，6kg",
            "1月1号练了深蹲五组三十个，自重",
          ].map((tip, i) => (
            <div key={i} className={cn("px-3 py-2 font-mono text-[11px] text-[#6D6D66] whitespace-nowrap overflow-x-auto", i < 2 && "border-b border-[rgba(26,26,26,0.08)]")}>
              <span className="text-[#A8A890] mr-2">{String(i+1).padStart(2,"0")} ›</span>{tip}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
