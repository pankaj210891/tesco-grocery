"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { DatePreset, UseDateFilterReturn } from "@/hooks/useDateFilter";

interface Preset {
  value: DatePreset;
  label: string;
}

const PRESETS: Preset[] = [
  { value: "all",       label: "All time"    },
  { value: "today",     label: "Today"       },
  { value: "yesterday", label: "Yesterday"   },
  { value: "last7",     label: "Last 7 days" },
  { value: "last30",    label: "Last 30 days"},
  { value: "thisMonth", label: "This month"  },
  { value: "custom",    label: "Custom range"},
];

const DATE_INPUT_CLS =
  "block w-full max-w-full min-w-0 appearance-none px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-base text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FCA311]/30";

function formatDateInput(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

interface Props {
  filter:    UseDateFilterReturn;
  className?: string;
  align?:    "left" | "right";
}

export default function DateFilter({ filter, className, align = "left" }: Props) {
  const [open,     setOpen]     = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [fromStr,  setFromStr]  = useState(formatDateInput(filter.range.from));
  const [toStr,    setToStr]    = useState(formatDateInput(filter.range.to));
  const ref = useRef<HTMLDivElement>(null);

  // Detect mobile breakpoint
  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768); }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Close desktop dropdown on outside click
  useEffect(() => {
    if (isMobile) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isMobile]);

  // Lock body scroll when mobile modal is open
  useEffect(() => {
    if (isMobile && open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, open]);

  function selectPreset(value: DatePreset) {
    if (value !== "custom") {
      filter.setPreset(value);
      setOpen(false);
    } else {
      filter.setPreset("custom");
    }
  }

  function applyCustom() {
    filter.setCustomRange(parseDate(fromStr), parseDate(toStr));
    setOpen(false);
  }

  const isActive = filter.preset !== "all";

  return (
    <>
      <div ref={ref} className={cn("relative", className)}>
        {/* Trigger button */}
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-colors",
            isActive
              ? "border-[#FCA311] bg-[#FCA311]/5 text-[#FCA311] dark:border-blue-500 dark:bg-blue-500/10 dark:text-amber-400"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600",
          )}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Calendar className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{filter.label}</span>
          {isActive && (
            <span
              role="button"
              aria-label="Clear date filter"
              className="ml-1 hover:text-red-500 transition-colors"
              onClick={(e) => { e.stopPropagation(); filter.reset(); }}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </span>
          )}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && !isMobile && "rotate-180")} aria-hidden />
        </button>

        {/* ── Desktop dropdown (md and above) ──────────────────────────── */}
        {open && !isMobile && (
          <div
            className={cn(
              "absolute top-full mt-2 z-[40] w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl py-2 max-h-[60vh] overflow-y-auto",
              align === "right" ? "right-0" : "left-0",
            )}
            role="listbox"
            aria-label="Date filter options"
          >
            {PRESETS.map((p) => (
              <button
                key={p.value}
                role="option"
                aria-selected={filter.preset === p.value}
                onClick={() => selectPreset(p.value)}
                className={cn(
                  "w-full text-left px-4 py-2.5 text-sm transition-colors",
                  filter.preset === p.value
                    ? "bg-[#FCA311]/8 text-[#FCA311] dark:text-amber-400 font-semibold"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                )}
              >
                {p.label}
              </button>
            ))}

            {filter.preset === "custom" && (
              <div className="mx-3 mt-2 mb-1 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                <DateRangeFields
                  fromStr={fromStr} setFromStr={setFromStr}
                  toStr={toStr}     setToStr={setToStr}
                />
                <button
                  onClick={applyCustom}
                  className="flex items-center justify-center w-full py-2 bg-[#FCA311] hover:bg-[#E8920A] text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile bottom-sheet modal (below md) ─────────────────────── */}
      {open && isMobile && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Date filter"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative bg-white dark:bg-gray-900 rounded-t-3xl w-full shadow-2xl animate-slide-up max-h-[90dvh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-base font-black text-gray-900 dark:text-white">Filter by date</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Preset list + custom range */}
            <div className="overflow-y-auto flex-1 py-2">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => selectPreset(p.value)}
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-3.5 text-sm transition-colors",
                    filter.preset === p.value
                      ? "text-[#FCA311] dark:text-amber-400 font-semibold bg-[#FCA311]/5 dark:bg-blue-500/10"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60",
                  )}
                >
                  {p.label}
                  {filter.preset === p.value && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}

              {filter.preset === "custom" && (
                <div className="px-5 pt-4 pb-2 space-y-4 border-t border-gray-100 dark:border-gray-800 mt-1">
                  <DateRangeFields
                    fromStr={fromStr} setFromStr={setFromStr}
                    toStr={toStr}     setToStr={setToStr}
                  />
                  <button
                    onClick={applyCustom}
                    className="flex items-center justify-center w-full py-3 bg-[#FCA311] hover:bg-[#E8920A] text-white text-sm font-bold rounded-2xl transition-colors"
                  >
                    Apply range
                  </button>
                </div>
              )}
            </div>

            <div className="shrink-0 pb-2" />
          </div>
        </div>
      )}
    </>
  );
}

function DateRangeFields({
  fromStr, setFromStr, toStr, setToStr,
}: {
  fromStr: string; setFromStr: (v: string) => void;
  toStr:   string; setToStr:   (v: string) => void;
}) {
  return (
    <>
      <div className="w-full min-w-0">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
          From
        </label>
        <input
          type="date"
          value={fromStr}
          onChange={(e) => setFromStr(e.target.value)}
          max={toStr || undefined}
          className={DATE_INPUT_CLS}
        />
      </div>
      <div className="w-full min-w-0">
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
          To
        </label>
        <input
          type="date"
          value={toStr}
          onChange={(e) => setToStr(e.target.value)}
          min={fromStr || undefined}
          className={DATE_INPUT_CLS}
        />
      </div>
    </>
  );
}
