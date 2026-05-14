"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { slugify } from "@/lib/utils/format";
import { SlidersHorizontal } from "lucide-react";

interface FiltersSidebarProps {
  categories: string[];
}

const PRICE_RANGES = [
  { label: "Under ₹100",   min: "0",   max: "100" },
  { label: "₹100 – ₹300", min: "100", max: "300" },
  { label: "₹300 – ₹600", min: "300", max: "600" },
  { label: "Over ₹600",   min: "600", max: "" },
] as const;

export default function FiltersSidebar({ categories }: FiltersSidebarProps) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const activeCategory = searchParams.get("category");
  const minPrice       = searchParams.get("minPrice");
  const maxPrice       = searchParams.get("maxPrice");
  const inStock        = searchParams.get("inStock") === "true";
  const hasActive      = !!(activeCategory || minPrice || maxPrice || inStock);

  const buildUrl = useCallback(
    (overrides: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v === null || v === "") { params.delete(k); } else { params.set(k, v); }
      }
      params.delete("page");
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [searchParams, pathname],
  );

  const navigate = useCallback(
    (overrides: Record<string, string | null>) => {
      router.replace(buildUrl(overrides), { scroll: false });
    },
    [router, buildUrl],
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const activePriceKey =
    PRICE_RANGES.find((r) => r.min === minPrice && r.max === (maxPrice ?? ""))?.label ?? null;

  return (
    <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#FCA311]" />
          <span className="font-bold text-gray-900 dark:text-white text-sm">Filters</span>
        </div>
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-[#FCA311] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Category ─────────────────────────── */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          Category
        </p>
        <ul className="space-y-0.5">
          {[{ label: "All Products", slug: null }, ...categories.map((c) => ({ label: c, slug: slugify(c) }))].map(
            ({ label, slug }) => {
              const isActive = slug === null ? !activeCategory : activeCategory === slug;
              return (
                <li key={label}>
                  <button
                    onClick={() => navigate({ category: slug })}
                    className={cn(
                      "w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors font-medium",
                      isActive
                        ? "bg-amber-50 dark:bg-amber-900/20 text-[#FCA311] dark:text-amber-400 border-l-2 border-[#FCA311]"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    )}
                  >
                    {label}
                  </button>
                </li>
              );
            },
          )}
        </ul>
      </div>

      {/* ── Price ────────────────────────────── */}
      <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          Price Range
        </p>
        <ul className="space-y-0.5">
          {PRICE_RANGES.map((r) => {
            const isActive = activePriceKey === r.label;
            return (
              <li key={r.label}>
                <button
                  onClick={() =>
                    navigate(
                      isActive
                        ? { minPrice: null, maxPrice: null }
                        : { minPrice: r.min, maxPrice: r.max || null },
                    )
                  }
                  className={cn(
                    "w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors font-medium",
                    isActive
                      ? "bg-amber-50 dark:bg-amber-900/20 text-[#FCA311] dark:text-amber-400 border-l-2 border-[#FCA311]"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                  )}
                >
                  {r.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Availability ─────────────────────── */}
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
          Availability
        </p>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div className="relative">
            <input
              type="checkbox"
              checked={inStock}
              onChange={() => navigate({ inStock: inStock ? null : "true" })}
              className="sr-only peer"
            />
            <div className={cn(
              "w-9 h-5 rounded-full border-2 transition-all",
              inStock
                ? "bg-[#FCA311] border-[#FCA311]"
                : "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600",
            )}>
              <div className={cn(
                "w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-[3px] transition-all duration-200",
                inStock ? "left-[18px]" : "left-[3px]",
              )} />
            </div>
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 select-none font-medium">
            In Stock Only
          </span>
        </label>
      </div>
    </div>
  );
}
