"use client";

import type { CSSProperties, ReactNode } from "react";
import { AdminTablePagination, type AdminTablePaginationProps } from "./AdminTablePagination";

export interface AdminTableShellProps {
  /**
   * Full `<tr>` element rendered inside `<thead>`. Accepting the complete row
   * lets consumers add responsive-hide classes on individual `<th>` cells.
   */
  headerRow:      ReactNode;
  loading?:       boolean;
  skeletonRows?:  number;
  /** Number of columns — used for the skeleton and empty-state colSpan. */
  colSpan:        number;
  isEmpty:        boolean;
  emptyMessage?:  string;
  /** Forwarded to the outer container div as inline style (maxHeight / height). */
  containerStyle?: CSSProperties;
  /** Extra className on the `<table>` element, e.g. "min-w-[640px]". */
  tableClassName?: string;
  /** `<tr>` elements for the table body. */
  children:       ReactNode;
  /** When provided, renders an AdminTablePagination footer. */
  pagination?:    AdminTablePaginationProps;
  /**
   * When true, omits the outer card (border, bg, rounded-xl) so the shell can
   * be used inside an already-styled container (e.g. a tabbed card div).
   */
  bare?:          boolean;
}

/**
 * Shared shell for admin list tables.
 *
 * Handles: outer card, sticky thead, overflow scroll, skeleton rows,
 * empty-state row, and an optional AdminTablePagination footer.
 * Each consumer supplies its own `headerRow` and row `children`.
 */
export function AdminTableShell({
  headerRow,
  loading = false,
  skeletonRows = 5,
  colSpan,
  isEmpty,
  emptyMessage = "No results found",
  containerStyle,
  tableClassName = "w-full text-sm",
  children,
  pagination,
  bare = false,
}: AdminTableShellProps) {
  const containerCls = bare
    ? "flex-1 overflow-hidden flex flex-col"
    : "bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col";

  return (
    <div className={containerCls} style={containerStyle}>
      <div className="overflow-auto flex-1">
        <table className={tableClassName}>
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
            {headerRow}
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={colSpan} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  </td>
                </tr>
              ))
            ) : isEmpty ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-10 text-center text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>

      {pagination && <AdminTablePagination {...pagination} />}
    </div>
  );
}
