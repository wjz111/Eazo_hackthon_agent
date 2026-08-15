"use client";

import { useState, useEffect } from "react";
import { fetchDailyAdvice } from "@/lib/api/workout";

interface DailyAdviceProps {
  /** 当有新记录保存后，父组件传入 refreshKey 触发重新获取 */
  refreshKey?: number;
}

export function DailyAdvice({ refreshKey = 0 }: DailyAdviceProps) {
  const [advice, setAdvice] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const text = await fetchDailyAdvice();
        if (!cancelled) setAdvice(text);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <div className="mx-4 mb-3 border border-[rgba(26,26,26,0.3)] relative">
      {/* 标签 */}
      <div className="absolute -top-2.5 left-3 bg-[#EBEBEA] px-1">
        <span className="text-[9px] tracking-widest text-[#3A7A4A] font-mono uppercase">
          TODAY&apos;S ADVICE
        </span>
      </div>
      {/* 四角装饰 */}
      <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-[#3A7A4A]" />
      <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-[#3A7A4A]" />
      <span className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-[#3A7A4A]" />
      <span className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-[#3A7A4A]" />

      <div className="px-4 py-3 min-h-[56px] flex items-center">
        {loading ? (
          /* 加载中 — 闪烁横线 */
          <div className="flex items-center gap-2 w-full">
            <span className="inline-block w-1.5 h-1.5 bg-[#3A7A4A] animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2 bg-[rgba(26,26,26,0.1)] animate-pulse w-3/4" />
              <div className="h-2 bg-[rgba(26,26,26,0.07)] animate-pulse w-1/2" />
            </div>
          </div>
        ) : error ? (
          <p className="text-xs font-mono text-[#6D6D66]">无法获取建议，请稍后重试</p>
        ) : (
          <div className="flex items-start gap-2.5 w-full">
            {/* 绿色左侧竖线 */}
            <span className="flex-shrink-0 w-0.5 self-stretch bg-[#3A7A4A] mt-0.5" />
            <p className="text-sm font-mono text-[#1A1A1A] leading-relaxed">{advice}</p>
          </div>
        )}
      </div>
    </div>
  );
}
