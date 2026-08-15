"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { changeLocale, getLocalePreference, type LocalePreference } from "@/i18n";
import { cn } from "@/utils/utils";

const LOCALES = [
  { code: "system", label: "SYS" },
  { code: "zh-CN", label: "中文" },
  { code: "en-US", label: "EN" },
] as const;

export function LocaleControl() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pref, setPref] = useState<LocalePreference>(() => getLocalePreference());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLabel = (() => {
    const lang = i18n.language || "zh-CN";
    return lang.startsWith("zh") ? "中" : "EN";
  })();

  const handleSelect = async (code: string) => {
    await changeLocale(code as LocalePreference);
    setPref(code as LocalePreference);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-7 px-2 text-[10px] font-mono tracking-widest uppercase transition-colors border",
          open
            ? "border-[#3A7A4A] text-[#3A7A4A] bg-[rgba(58,122,74,0.08)]"
            : "border-[rgba(26,26,26,0.3)] text-[#6D6D66] hover:border-[#3A7A4A] hover:text-[#3A7A4A]"
        )}
      >
        {currentLabel}
      </button>

      {open && (
        <div className="absolute right-0 top-8 bg-[#EBEBEA] border border-[rgba(26,26,26,0.3)] py-0 min-w-[80px] z-50 shadow-sm">
          {LOCALES.map((loc) => (
            <button
              key={loc.code}
              onClick={() => handleSelect(loc.code)}
              className={cn(
                "w-full text-left px-3 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors border-b border-[rgba(26,26,26,0.08)] last:border-0",
                pref === loc.code
                  ? "text-[#3A7A4A] font-bold bg-[rgba(58,122,74,0.1)]"
                  : "text-[#6D6D66] hover:text-[#1A1A1A] hover:bg-[rgba(26,26,26,0.05)]"
              )}
            >
              {loc.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
