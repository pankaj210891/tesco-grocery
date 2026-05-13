"use client";

import { useState, useCallback, useMemo } from "react";

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "custom";

export interface DateRange {
  from: Date | null;
  to:   Date | null;
}

export interface UseDateFilterReturn {
  preset:    DatePreset;
  range:     DateRange;
  setPreset: (p: DatePreset) => void;
  setCustomRange: (from: Date | null, to: Date | null) => void;
  isInRange:  (dateStr: string) => boolean;
  label:      string;
  reset:      () => void;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function rangeForPreset(preset: DatePreset): DateRange {
  const now   = new Date();
  const today = startOfDay(now);

  switch (preset) {
    case "today":
      return { from: today, to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: y, to: endOfDay(y) };
    }
    case "last7": {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: endOfDay(now) };
    }
    case "last30": {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from, to: endOfDay(now) };
    }
    case "thisMonth": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: endOfDay(now) };
    }
    default:
      return { from: null, to: null };
  }
}

const LABELS: Record<DatePreset, string> = {
  all:       "All time",
  today:     "Today",
  yesterday: "Yesterday",
  last7:     "Last 7 days",
  last30:    "Last 30 days",
  thisMonth: "This month",
  custom:    "Custom range",
};

export function useDateFilter(initialPreset: DatePreset = "all"): UseDateFilterReturn {
  const [preset, setPresetState] = useState<DatePreset>(initialPreset);
  const [customRange, setCustomRangeState] = useState<DateRange>({ from: null, to: null });

  const range = useMemo<DateRange>(() => {
    if (preset === "custom") return customRange;
    return rangeForPreset(preset);
  }, [preset, customRange]);

  const setPreset = useCallback((p: DatePreset) => {
    setPresetState(p);
  }, []);

  const setCustomRange = useCallback((from: Date | null, to: Date | null) => {
    setPresetState("custom");
    setCustomRangeState({ from, to });
  }, []);

  const isInRange = useCallback(
    (dateStr: string): boolean => {
      if (!range.from && !range.to) return true;
      const d = new Date(dateStr);
      if (range.from && d < range.from) return false;
      if (range.to   && d > range.to)   return false;
      return true;
    },
    [range],
  );

  const reset = useCallback(() => {
    setPresetState("all");
    setCustomRangeState({ from: null, to: null });
  }, []);

  return {
    preset,
    range,
    setPreset,
    setCustomRange,
    isInRange,
    label: LABELS[preset],
    reset,
  };
}
