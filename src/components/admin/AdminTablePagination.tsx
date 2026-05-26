"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export interface AdminTablePaginationProps {
  page:         number;
  totalPages:   number;
  total:        number;
  /** Singular noun used in the summary line, e.g. "orders", "users". */
  label:        string;
  onPageChange: (page: number) => void;
  /** Optional prefix for data-testid attributes, e.g. "user" → "user-prev-page". */
  testIdPrefix?: string;
}

/** Pagination footer row shared across admin list tables. Returns null when there is only one page. */
export function AdminTablePagination({
  page,
  totalPages,
  total,
  label,
  onPageChange,
  testIdPrefix,
}: AdminTablePaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-sm shrink-0">
      <span
        className="text-gray-500"
        data-testid={testIdPrefix ? `${testIdPrefix}-pagination-info` : undefined}
      >
        Page {page} of {totalPages} · {total} {label}
      </span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          data-testid={testIdPrefix ? `${testIdPrefix}-prev-page` : undefined}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
          data-testid={testIdPrefix ? `${testIdPrefix}-next-page` : undefined}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
