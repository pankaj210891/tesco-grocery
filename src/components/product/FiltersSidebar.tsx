"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { slugify } from "@/lib/utils/format";

interface FiltersSidebarProps {
  categories: string[];
}

const PRICE_RANGES = [
  { label: "Under ₹100", min: "0",   max: "100" },
  { label: "₹100 – ₹300", min: "100", max: "300" },
  { label: "₹300 – ₹600", min: "300", max: "600" },
  { label: "Over ₹600",  min: "600", max: "" },
] as const;

export default function FiltersSidebar({ categories }: FiltersSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const activeCategory = searchParams.get("category");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const inStock = searchParams.get("inStock") === "true";

  const hasActive = !!(activeCategory || minPrice || maxPrice || inStock);

  const buildUrl = useCallback(
    (overrides: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v === null || v === "") {
          params.delete(k);
        } else {
          params.set(k, v);
        }
      }
      const qs = params.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [searchParams, pathname]
  );

  const navigate = useCallback(
    (overrides: Record<string, string | null>) => {
      router.replace(buildUrl(overrides), { scroll: false });
    },
    [router, buildUrl]
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const activePriceKey =
    PRICE_RANGES.find(
      (r) => r.min === minPrice && r.max === (maxPrice ?? "")
    )?.label ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-900 dark:text-white text-base">Filters</span>
        {hasActive && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-[#FCA311] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Category ─────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Category
        </p>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => navigate({ category: null })}
              className={cn(
                "w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors",
                !activeCategory
                  ? "bg-blue-50 text-[#FCA311] font-semibold"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              All Products
            </button>
          </li>
          {categories.map((cat) => {
            const slug = slugify(cat);
            const isActive = activeCategory === slug;
            return (
              <li key={cat}>
                <button
                  onClick={() =>
                    navigate({ category: isActive ? null : slug })
                  }
                  className={cn(
                    "w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-50 text-[#FCA311] font-semibold"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                >
                  {cat}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Price ────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Price
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
                        : { minPrice: r.min, maxPrice: r.max || null }
                    )
                  }
                  className={cn(
                    "w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-50 text-[#FCA311] font-semibold"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  )}
                >
                  {r.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Availability ─────────────────────────── */}
      <div>
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Availability
        </p>
        <label className="flex items-center gap-2.5 cursor-pointer group px-1">
          <input
            type="checkbox"
            checked={inStock}
            onChange={() =>
              navigate({ inStock: inStock ? null : "true" })
            }
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#FCA311] focus:ring-[#FCA311] cursor-pointer dark:bg-gray-700"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
            In Stock Only
          </span>
        </label>
      </div>
    </div>
  );
}
