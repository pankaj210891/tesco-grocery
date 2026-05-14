"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface Props {
  currentPage: number;
  totalPages:  number;
  total:       number;
  limit:       number;
}

function buildHref(
  pathname: string,
  params:   URLSearchParams,
  page:     number,
): string {
  const next = new URLSearchParams(params);
  if (page === 1) next.delete("page"); else next.set("page", String(page));
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function getPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p);
  }
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

export default function Pagination({ currentPage, totalPages, total, limit }: Props) {
  const router     = useRouter();
  const pathname   = usePathname();
  const params     = useSearchParams();
  const pages      = getPageNumbers(currentPage, totalPages);
  const startItem  = (currentPage - 1) * limit + 1;
  const endItem    = Math.min(currentPage * limit, total);

  function go(page: number) {
    router.push(buildHref(pathname, params, page));
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Showing <span className="font-semibold text-gray-700 dark:text-gray-300">{startItem}–{endItem}</span> of{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-300">{total}</span> products
      </p>

      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          onClick={() => go(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-xl border text-sm font-medium transition-colors",
            currentPage <= 1
              ? "border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400 dark:text-gray-500 text-sm select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => go(p as number)}
              aria-current={p === currentPage ? "page" : undefined}
              className={cn(
                "flex items-center justify-center h-9 min-w-[2.25rem] px-2 rounded-xl border text-sm font-semibold transition-colors",
                p === currentPage
                  ? "bg-[#00539F] border-[#00539F] text-white shadow-sm"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => go(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-xl border text-sm font-medium transition-colors",
            currentPage >= totalPages
              ? "border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 cursor-not-allowed"
              : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
