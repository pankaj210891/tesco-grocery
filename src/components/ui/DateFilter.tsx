"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown, X } from "lucide-react";
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
  const [open,    setOpen]    = useState(false);
  const [fromStr, setFromStr] = useState(formatDateInput(filter.range.from));
  const [toStr,   setToStr]   = useState(formatDateInput(filter.range.to));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function applyCustom() {
    filter.setCustomRange(parseDate(fromStr), parseDate(toStr));
    setOpen(false);
  }

  const isActive = filter.preset !== "all";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all",
          isActive
            ? "border-[#00539F] bg-[#00539F]/5 text-[#00539F] dark:border-blue-500 dark:bg-blue-500/10 dark:text-blue-400"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600",
        )}
        aria-haspopup="listbox"
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
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full mt-2 z-50 w-64 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl py-2",
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
              onClick={() => {
                if (p.value !== "custom") {
                  filter.setPreset(p.value);
                  setOpen(false);
                } else {
                  filter.setPreset("custom");
                }
              }}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm transition-colors",
                filter.preset === p.value
                  ? "bg-[#00539F]/8 text-[#00539F] dark:text-blue-400 font-semibold"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
              )}
            >
              {p.label}
            </button>
          ))}

          {filter.preset === "custom" && (
            <div className="mx-3 mt-2 mb-1 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={fromStr}
                  onChange={(e) => setFromStr(e.target.value)}
                  max={toStr || undefined}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00539F]/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={toStr}
                  onChange={(e) => setToStr(e.target.value)}
                  min={fromStr || undefined}
                  className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00539F]/30"
                />
              </div>
              <button
                onClick={applyCustom}
                className="w-full py-2 bg-[#00539F] hover:bg-[#003B7A] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
