"use client";

import { useState, useRef, useEffect, useLayoutEffect, useId } from "react";
import { Calendar, X } from "lucide-react";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

const DATE_PRESETS = [
  {
    label: "Today",
    getValue: () => { const d = toISODate(new Date()); return { from: d, to: d }; },
  },
  {
    label: "Yesterday",
    getValue: () => {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const s = toISODate(d); return { from: s, to: s };
    },
  },
  {
    label: "Last 7 days",
    getValue: () => {
      const from = new Date(); from.setDate(from.getDate() - 6);
      return { from: toISODate(from), to: toISODate(new Date()) };
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const from = new Date(); from.setDate(from.getDate() - 29);
      return { from: toISODate(from), to: toISODate(new Date()) };
    },
  },
  {
    label: "This month",
    getValue: () => {
      const from = new Date(); from.setDate(1);
      return { from: toISODate(from), to: toISODate(new Date()) };
    },
  },
] as const;

interface AdminDateFilterProps {
  dateFrom: string;
  dateTo:   string;
  onApply:  (from: string, to: string) => void;
  onClear:  () => void;
  label?:   string;
}

export function AdminDateFilter({
  dateFrom, dateTo, onApply, onClear, label = "Date filter",
}: AdminDateFilterProps) {
  const id = useId();
  const [open, setOpen]         = useState(false);
  const [tempFrom, setTempFrom] = useState(dateFrom);
  const [tempTo,   setTempTo]   = useState(dateTo);
  const containerRef  = useRef<HTMLDivElement>(null);
  const triggerRef    = useRef<HTMLButtonElement>(null);
  const panelRef      = useRef<HTMLDivElement>(null);
  const [panelSide, setPanelSide] = useState<"left" | "right">("left");

  useLayoutEffect(() => {
    if (!open || !panelRef.current) return;
    const { right } = panelRef.current.getBoundingClientRect();
    setPanelSide(right > window.innerWidth - 8 ? "right" : "left");
  }, [open]);

  const hasFilter   = !!(dateFrom || dateTo);
  const hasInvalidRange = !!(tempFrom && tempTo && tempFrom > tempTo);
  const canApply    = (tempFrom || tempTo) && !hasInvalidRange;

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleToggle() {
    if (!open) {
      setTempFrom(dateFrom);
      setTempTo(dateTo);
    }
    setOpen((v) => !v);
  }

  function applyPreset(from: string, to: string) {
    onApply(from, to);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function applyCustom() {
    if (!canApply) return;
    onApply(tempFrom, tempTo);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleClear() {
    onClear();
    setTempFrom("");
    setTempTo("");
    setOpen(false);
    triggerRef.current?.focus();
  }

  const fromId = `${id}-from`;
  const toId   = `${id}-to`;

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={hasFilter ? `Date filter active: ${dateFrom || "—"} to ${dateTo || "—"}` : label}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
          hasFilter
            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
        }`}
        data-testid="date-filter-btn"
      >
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{hasFilter ? `${dateFrom || "—"} → ${dateTo || "—"}` : label}</span>
        {hasFilter && (
          <X
            className="h-3 w-3 shrink-0 ml-0.5 opacity-60"
            aria-hidden="true"
          />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Date range picker"
          className={`absolute top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-4 min-w-[280px] max-w-[calc(100vw-1rem)] ${
            panelSide === "right" ? "right-0" : "left-0"
          }`}
        >
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Quick select
          </p>

          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {DATE_PRESETS.map((preset) => {
              const { from, to } = preset.getValue();
              return (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(from, to)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  data-testid={`date-preset-${preset.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <div>
              <label htmlFor={fromId} className="text-[11px] text-gray-400 mb-0.5 block">
                From
              </label>
              <input
                id={fromId}
                type="date"
                value={tempFrom}
                max={tempTo || undefined}
                onChange={(e) => setTempFrom(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400"
                data-testid="date-from-input"
              />
            </div>
            <div>
              <label htmlFor={toId} className="text-[11px] text-gray-400 mb-0.5 block">
                To
              </label>
              <input
                id={toId}
                type="date"
                value={tempTo}
                min={tempFrom || undefined}
                onChange={(e) => setTempTo(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400"
                data-testid="date-to-input"
              />
            </div>

            {hasInvalidRange && (
              <p role="alert" className="text-[11px] text-red-500 dark:text-red-400 mt-1">
                &ldquo;From&rdquo; date must be before &ldquo;To&rdquo; date.
              </p>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={applyCustom}
              disabled={!canApply}
              className="flex-1 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/40 disabled:cursor-not-allowed text-white rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              data-testid="date-filter-apply"
            >
              Apply
            </button>
            {hasFilter && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                data-testid="date-filter-clear"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
