"use client";

import { X } from "lucide-react";

interface FilterChipProps {
  label:    string;
  onRemove: () => void;
}

export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-blue-900 dark:hover:text-blue-100"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
