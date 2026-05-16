"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, SlidersHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { slugify } from "@/lib/utils/format";
import { useFilterDraftStore } from "@/store/filter.store";
import { useDebounce } from "@/hooks/useDebounce";
import { RATING_OPTIONS, DISCOUNT_OPTIONS, DELIVERY_OPTIONS } from "@/constants";

interface FiltersSidebarProps {
  categories:    string[];
  subcategories: string[];
  brands:        string[];
}

// ── Collapsible section ───────────────────────────────────────────────────────
// All sections start collapsed by default; user can expand/collapse freely.

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-700/60 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5"
        aria-expanded={open}
      >
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
          {title}
        </p>
        {open
          ? <ChevronUp  className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
          : <ChevronDown className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────

export default function FiltersSidebar({ categories, subcategories, brands }: FiltersSidebarProps) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  // ── Parse current URL state ─────────────────────────────────────────────────
  const activeCategory      = searchParams.get("category");
  const activeSubcategory   = searchParams.get("subcategory");
  const activeBrandParam    = searchParams.get("brand") ?? "";
  const activeBrands        = useMemo(
    () => (activeBrandParam.length > 0 ? activeBrandParam.split(",").filter(Boolean) : []),
    [activeBrandParam],
  );
  const minPrice            = searchParams.get("minPrice");
  const maxPrice            = searchParams.get("maxPrice");
  const inStock             = searchParams.get("inStock") === "true";
  const activeRating        = searchParams.get("rating") ? Number(searchParams.get("rating")) : null;
  const activeDiscount      = searchParams.get("discount") ? Number(searchParams.get("discount")) : null;
  const activeDeliveryParam = searchParams.get("delivery") ?? "";
  const activeDelivery      = useMemo(
    () => (activeDeliveryParam.length > 0 ? activeDeliveryParam.split(",").filter(Boolean) : []),
    [activeDeliveryParam],
  );

  const hasActive = !!(
    activeCategory || activeSubcategory || activeBrands.length ||
    (minPrice && maxPrice) || inStock || activeRating || activeDiscount || activeDelivery.length
  );

  // ── Brand search / show-more (memoised) ────────────────────────────────────
  const [brandSearch, setBrandSearch]   = useState("");
  const [showAllBrands, setShowAllBrands] = useState(false);
  const BRAND_LIMIT = 6;

  const filteredBrands = useMemo(
    () => brands.filter((b) => b.toLowerCase().includes(brandSearch.toLowerCase())),
    [brands, brandSearch],
  );
  const visibleBrands = useMemo(
    () => (showAllBrands ? filteredBrands : filteredBrands.slice(0, BRAND_LIMIT)),
    [filteredBrands, showAllBrands],
  );

  // ── URL helpers ─────────────────────────────────────────────────────────────

  function buildUrl(overrides: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === "") { params.delete(k); } else { params.set(k, v); }
    }
    params.delete("page");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function navigate(overrides: Record<string, string | null>) {
    router.replace(buildUrl(overrides), { scroll: false });
  }

  function clearAll() {
    clearPriceDraft();
    router.replace(pathname, { scroll: false });
  }

  // ── Debounced price inputs ───────────────────────────────────────────────────
  const {
    draftMinPrice, draftMaxPrice,
    setDraftMinPrice, setDraftMaxPrice,
    syncFromUrl, clearPriceDraft,
  } = useFilterDraftStore();

  // Re-sync draft inputs whenever the URL price params change (covers external
  // chip removal, clear-all, and direct URL edits).
  useEffect(() => {
    syncFromUrl(minPrice, maxPrice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPrice, maxPrice]);

  const debouncedMin = useDebounce(draftMinPrice, 600);
  const debouncedMax = useDebounce(draftMaxPrice, 600);

  // Commit to URL only when BOTH fields have valid values (or both are empty).
  // A single bound is kept as draft-only and never committed.
  useEffect(() => {
    const bothFilled  = debouncedMin !== "" && debouncedMax !== "";
    const bothEmpty   = debouncedMin === "" && debouncedMax === "";
    const currentMin  = searchParams.get("minPrice") ?? "";
    const currentMax  = searchParams.get("maxPrice") ?? "";

    if (!bothFilled && !bothEmpty) return; // one side filled — wait for the other
    if (debouncedMin === currentMin && debouncedMax === currentMax) return;

    const params = new URLSearchParams(searchParams.toString());
    if (bothEmpty) {
      params.delete("minPrice");
      params.delete("maxPrice");
    } else {
      params.set("minPrice", debouncedMin);
      params.set("maxPrice", debouncedMax);
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedMin, debouncedMax]);

  // ── Brand / delivery toggles ────────────────────────────────────────────────

  function toggleBrand(brand: string) {
    const next = activeBrands.includes(brand)
      ? activeBrands.filter((b) => b !== brand)
      : [...activeBrands, brand];
    navigate({ brand: next.length ? next.join(",") : null });
  }

  function toggleDelivery(option: string) {
    const next = activeDelivery.includes(option)
      ? activeDelivery.filter((d) => d !== option)
      : [...activeDelivery, option];
    navigate({ delivery: next.length ? next.join(",") : null });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden"
      data-testid="filters-sidebar"
    >
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
            data-testid="clear-all-filters"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Category ─────────────────────────────────────────────────────────── */}
      <FilterSection title="Category">
        <ul className="space-y-0.5" role="listbox" aria-label="Category filter">
          {[
            { label: "All Products", slug: null },
            ...categories.map((c) => ({ label: c, slug: slugify(c) })),
          ].map(({ label, slug }) => {
            const isActive = slug === null ? !activeCategory : activeCategory === slug;
            return (
              <li key={label} role="option" aria-selected={isActive}>
                <button
                  onClick={() => navigate({ category: slug, subcategory: null })}
                  className={cn(
                    "w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors font-medium",
                    isActive
                      ? "bg-amber-50 dark:bg-amber-900/20 text-[#FCA311] dark:text-amber-400 border-l-2 border-[#FCA311]"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                  )}
                  data-testid={`category-filter-${slug ?? "all"}`}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      {/* ── Subcategory ───────────────────────────────────────────────────────── */}
      {subcategories.length > 0 && (
        <FilterSection title="Subcategory">
          <ul className="space-y-0.5">
            {subcategories.map((sub) => {
              const isActive = activeSubcategory === sub;
              return (
                <li key={sub}>
                  <button
                    onClick={() => navigate({ subcategory: isActive ? null : sub })}
                    className={cn(
                      "w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors font-medium",
                      isActive
                        ? "bg-amber-50 dark:bg-amber-900/20 text-[#FCA311] dark:text-amber-400 border-l-2 border-[#FCA311]"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    )}
                    data-testid={`subcategory-filter-${sub}`}
                  >
                    {sub}
                  </button>
                </li>
              );
            })}
          </ul>
        </FilterSection>
      )}

      {/* ── Brand ────────────────────────────────────────────────────────────── */}
      {brands.length > 0 && (
        <FilterSection title="Brand">
          {/* Search — always shown for consistent UX */}
          <input
            type="text"
            placeholder="Search brands…"
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1.5 mb-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:border-[#FCA311]"
            aria-label="Search brands"
            data-testid="brand-search-input"
          />
          {/* Scrollable list — prevents the sidebar from growing unbounded */}
          <div className="max-h-48 overflow-y-auto overscroll-contain pr-1">
            <ul className="space-y-1" aria-label="Brand filter">
              {visibleBrands.map((brand) => {
                const checked = activeBrands.includes(brand);
                return (
                  <li key={brand}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBrand(brand)}
                        className="h-3.5 w-3.5 rounded accent-[#FCA311] cursor-pointer shrink-0"
                        aria-label={brand}
                        data-testid={`brand-checkbox-${brand}`}
                      />
                      <span className={cn(
                        "text-sm truncate transition-colors",
                        checked
                          ? "text-[#FCA311] dark:text-amber-400 font-medium"
                          : "text-gray-600 dark:text-gray-300",
                      )}>
                        {brand}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          {filteredBrands.length > BRAND_LIMIT && (
            <button
              onClick={() => setShowAllBrands((s) => !s)}
              className="mt-2 text-xs font-semibold text-[#FCA311] hover:underline"
              data-testid="toggle-show-all-brands"
            >
              {showAllBrands ? "Show less" : `+${filteredBrands.length - BRAND_LIMIT} more`}
            </button>
          )}
        </FilterSection>
      )}

      {/* ── Price Range ───────────────────────────────────────────────────────── */}
      <FilterSection title="Price Range">
        <div className="flex items-center gap-2" role="group" aria-label="Custom price range">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
            <input
              type="number"
              min={0}
              placeholder="Min"
              value={draftMinPrice}
              onChange={(e) => setDraftMinPrice(e.target.value)}
              className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]"
              aria-label="Minimum price"
              data-testid="price-min-input"
            />
          </div>
          <span className="text-gray-400 text-xs flex-shrink-0">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
            <input
              type="number"
              min={0}
              placeholder="Max"
              value={draftMaxPrice}
              onChange={(e) => setDraftMaxPrice(e.target.value)}
              className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#FCA311] focus:ring-1 focus:ring-[#FCA311]"
              aria-label="Maximum price"
              data-testid="price-max-input"
            />
          </div>
        </div>
        {/* Hint: both fields required */}
        {(draftMinPrice || draftMaxPrice) && !(draftMinPrice && draftMaxPrice) && (
          <p className="text-[10px] text-amber-500 mt-1.5">
            Enter both min and max to apply price filter
          </p>
        )}
      </FilterSection>

      {/* ── Customer Ratings ──────────────────────────────────────────────────── */}
      <FilterSection title="Customer Ratings">
        <ul className="space-y-0.5" role="listbox" aria-label="Rating filter">
          {RATING_OPTIONS.map(({ label, value }) => {
            const isActive = activeRating === value;
            return (
              <li key={value} role="option" aria-selected={isActive}>
                <button
                  onClick={() => navigate({ rating: isActive ? null : String(value) })}
                  className={cn(
                    "w-full flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-amber-50 dark:bg-amber-900/20 text-[#FCA311] dark:text-amber-400 border-l-2 border-[#FCA311]"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                  )}
                  data-testid={`rating-filter-${value}`}
                  aria-label={label}
                >
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: value }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                    {Array.from({ length: 5 - value }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-gray-200 text-gray-300 dark:fill-gray-600 dark:text-gray-500" />
                    ))}
                  </span>
                  <span className="text-xs font-medium">{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      {/* ── Discount ──────────────────────────────────────────────────────────── */}
      <FilterSection title="Discount">
        <ul className="space-y-0.5" role="listbox" aria-label="Discount filter">
          {DISCOUNT_OPTIONS.map(({ label, value }) => {
            const isActive = activeDiscount === value;
            return (
              <li key={value} role="option" aria-selected={isActive}>
                <button
                  onClick={() => navigate({ discount: isActive ? null : String(value) })}
                  className={cn(
                    "w-full text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors font-medium",
                    isActive
                      ? "bg-amber-50 dark:bg-amber-900/20 text-[#FCA311] dark:text-amber-400 border-l-2 border-[#FCA311]"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                  )}
                  data-testid={`discount-filter-${value}`}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      </FilterSection>

      {/* ── Availability ──────────────────────────────────────────────────────── */}
      <FilterSection title="Availability">
        <label className="flex items-center gap-3 cursor-pointer" htmlFor="instock-toggle">
          <div className="relative">
            <input
              id="instock-toggle"
              type="checkbox"
              checked={inStock}
              onChange={() => navigate({ inStock: inStock ? null : "true" })}
              className="sr-only peer"
              data-testid="instock-toggle"
            />
            <div className={cn(
              "w-9 h-5 rounded-full border-2 transition-colors",
              inStock
                ? "bg-[#FCA311] border-[#FCA311]"
                : "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600",
            )}>
              <div className={cn(
                "w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute top-[3px] transition-transform duration-200",
                inStock ? "left-[18px]" : "left-[3px]",
              )} />
            </div>
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 select-none font-medium">
            In Stock Only
          </span>
        </label>
      </FilterSection>

      {/* ── Delivery Options ──────────────────────────────────────────────────── */}
      <FilterSection title="Delivery Options">
        <ul className="space-y-1" aria-label="Delivery filter">
          {DELIVERY_OPTIONS.map(({ label, value }) => {
            const checked = activeDelivery.includes(value);
            return (
              <li key={value}>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleDelivery(value)}
                    className="h-3.5 w-3.5 rounded accent-[#FCA311] cursor-pointer"
                    aria-label={label}
                    data-testid={`delivery-filter-${value}`}
                  />
                  <span className={cn(
                    "text-sm transition-colors",
                    checked
                      ? "text-[#FCA311] dark:text-amber-400 font-medium"
                      : "text-gray-600 dark:text-gray-300",
                  )}>
                    {label}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </FilterSection>
    </div>
  );
}
