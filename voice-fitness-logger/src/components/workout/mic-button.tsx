"use client";

import { useState, useRef, useCallback } from "react";
import { cn } from "@/utils/utils";

export type RecordState = "idle" | "recording" | "processing";

interface MicButtonProps {
  state: RecordState;
  onToggle: (transcript: string) => void;
  onError: (msg: string) => void;
  onInterim?: (text: string) => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SRInstance;
    webkitSpeechRecognition: new () => SRInstance;
  }
}

interface SRInstance extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void;
  onstart: ((this: SRInstance, ev: Event) => void) | null;
  onresult: ((this: SRInstance, ev: SREvent) => void) | null;
  onerror: ((this: SRInstance, ev: SRErrEvent) => void) | null;
  onend: ((this: SRInstance, ev: Event) => void) | null;
}
interface SREvent extends Event { results: SRResultList; resultIndex: number; }
interface SRErrEvent extends Event { error: string; }
interface SRResultList { readonly length: number; [i: number]: SRResult; }
interface SRResult { readonly length: number; isFinal: boolean; [i: number]: SRAlternative; }
interface SRAlternative { transcript: string; confidence: number; }

export function MicButton({ state, onToggle, onError, onInterim }: MicButtonProps) {
  const recognitionRef = useRef<SRInstance | null>(null);
  const [isListening, setIsListening] = useState(false);
  const accumulatedRef = useRef("");
  const userStoppedRef = useRef(false);

  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      onError("当前浏览器不支持语音识别，请使用 Chrome 或 Safari");
      return;
    }

    accumulatedRef.current = "";
    userStoppedRef.current = false;
    onInterim?.("");

    const r = new SR();
    r.lang = "zh-CN";
    r.continuous = true;      // 不因停顿自动结束
    r.interimResults = true;  // 实时中间结果
    r.maxAlternatives = 1;

    r.onstart = () => setIsListening(true);

    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          accumulatedRef.current += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      onInterim?.(accumulatedRef.current + interim);
    };

    r.onerror = (e) => {
      // no-speech 在 continuous 模式下是非致命错误，忽略
      if (e.error === "no-speech") return;
      r.onstart = null; r.onresult = null; r.onerror = null; r.onend = null;
      try { r.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
      setIsListening(false);
      if (e.error === "not-allowed") onError("麦克风权限被拒绝，请在浏览器设置中允许");
      else if (e.error === "network") onError("网络错误，语音服务需要联网");
      else onError(`语音识别错误: ${e.error}`);
    };

    r.onend = () => {
      if (recognitionRef.current !== r) return;
      recognitionRef.current = null;
      setIsListening(false);
      if (userStoppedRef.current) {
        // 用户主动停止 — 提交累积文字
        const text = accumulatedRef.current.trim();
        accumulatedRef.current = "";
        userStoppedRef.current = false;
        onToggle(text);
      }
      // 非用户主动停止（系统中断等）— 静默结束，让用户重新点击
    };

    recognitionRef.current = r;
    try {
      r.start();
    } catch (err) {
      recognitionRef.current = null;
      onError(`无法启动录音: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [onToggle, onError, onInterim]);

  const stopRecognition = useCallback(() => {
    userStoppedRef.current = true;
    const r = recognitionRef.current;
    if (r) {
      try { r.stop(); } catch { /* ignore */ }
    } else {
      setIsListening(false);
      const text = accumulatedRef.current.trim();
      accumulatedRef.current = "";
      userStoppedRef.current = false;
      onToggle(text);
    }
  }, [onToggle]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (state !== "idle") return;
    isListening ? stopRecognition() : startRecognition();
  };

  const active = isListening || state === "recording";
  const processing = state === "processing";

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative">
        {/* 外层标注框 */}
        <div className={cn(
          "absolute -inset-7 border pointer-events-none transition-colors duration-200",
          active ? "border-[#3A7A4A]" : "border-[rgba(26,26,26,0.25)]"
        )}>
          <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-[#3A7A4A]" />
          <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-[#3A7A4A]" />
          <span className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-[#3A7A4A]" />
          <span className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-[#3A7A4A]" />
          <span className="absolute -top-5 left-0 text-[9px] tracking-widest text-[#3A7A4A] uppercase font-mono">
            {active ? "● REC" : processing ? "PROC" : "INPUT"}
          </span>
          <span className="absolute -bottom-5 right-0 text-[9px] tracking-widest text-[#A8A890] font-mono">
            112×112
          </span>
        </div>

        {/* 打孔圆形按钮 */}
        <button
          onClick={handleClick}
          disabled={processing}
          className={cn(
            "relative w-28 h-28 rounded-full flex items-center justify-center",
            "transition-all duration-180 select-none border-2",
            active
              ? "bg-[#3A7A4A] border-[#3A7A4A]"
              : processing
              ? "bg-[#D4D4D2] border-[rgba(26,26,26,0.3)] cursor-not-allowed"
              : "bg-[#EBEBEA] border-[rgba(26,26,26,0.45)] hover:border-[#3A7A4A]",
            "active:scale-95"
          )}
          aria-label={active ? "停止录音" : "开始录音"}
        >
          {processing ? (
            <svg className="w-7 h-7 animate-spin" viewBox="0 0 28 28" fill="none">
              <circle cx="14" cy="14" r="10" stroke="rgba(26,26,26,0.2)" strokeWidth="2" />
              <path d="M14 4 A10 10 0 0 1 24 14" stroke="#3A7A4A" strokeWidth="2" strokeLinecap="square"/>
            </svg>
          ) : active ? (
            <span className="w-7 h-7 border-2 border-[#F5F5F0] bg-[#F5F5F0]" />
          ) : (
            <svg className="w-9 h-9 text-[#1A1A1A]" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter">
              <rect x="12" y="3" width="12" height="18" />
              <path d="M6 18 C6 27 30 27 30 18" fill="none"/>
              <line x1="18" y1="27" x2="18" y2="33"/>
              <line x1="11" y1="33" x2="25" y2="33"/>
            </svg>
          )}
        </button>
      </div>

      <div className="mt-12 text-[9px] tracking-[0.2em] text-[#6D6D66] uppercase font-mono">
        {active ? "RECORDING / TAP TO STOP" : processing ? "AI PARSING…" : "TAP TO RECORD"}
      </div>
    </div>
  );
}
