"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { titleCase } from "@/lib/utils/format";
import { DELIVERY_OPTIONS, DISCOUNT_OPTIONS, RATING_OPTIONS } from "@/constants";
import { useFilterDraftStore } from "@/store/filter.store";

interface Chip {
  label:  string;
  remove: () => void;
}

interface ActiveFiltersProps {
  /** Resolved human-readable name for the active category (e.g. "Salmon & Trout").
   *  Passed from the server so we avoid re-fetching on the client. */
  categoryLabel?: string;
}

export default function ActiveFilters({ categoryLabel }: ActiveFiltersProps) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();
  const dynamicFilters = useFilterDraftStore((s) => s.dynamicFilters);

  function removeParam(...keys: string[]) {
    const params = new URLSearchParams(searchParams.toString());
    keys.forEach((k) => params.delete(k));
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function removeFromList(key: string, value: string) {
    const params  = new URLSearchParams(searchParams.toString());
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next    = current.filter((v) => v !== value);
    if (next.length) { params.set(key, next.join(",")); } else { params.delete(key); }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function removeAttrValue(attrKey: string, value: string) {
    const params  = new URLSearchParams(searchParams.toString());
    const raw     = params.get("attrs");
    let current: Record<string, string[]> = {};
    if (raw) {
      try { current = JSON.parse(raw) as Record<string, string[]>; } catch { /* skip */ }
    }
    const next = (current[attrKey] ?? []).filter((v) => v !== value);
    if (next.length > 0) {
      current[attrKey] = next;
    } else {
      delete current[attrKey];
    }
    if (Object.keys(current).length > 0) {
      params.set("attrs", JSON.stringify(current));
    } else {
      params.delete("attrs");
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const chips: Chip[] = [];

  const q             = searchParams.get("q");
  const category      = searchParams.get("category");
  const subcategory   = searchParams.get("subcategory");
  const brandParam    = searchParams.get("brand") ?? "";
  const brands        = brandParam ? brandParam.split(",").filter(Boolean) : [];
  const minPrice      = searchParams.get("minPrice");
  const maxPrice      = searchParams.get("maxPrice");
  const inStock       = searchParams.get("inStock");
  const ratingRaw     = searchParams.get("rating");
  const discountRaw   = searchParams.get("discount");
  const deliveryParam = searchParams.get("delivery") ?? "";
  const deliveries    = deliveryParam ? deliveryParam.split(",").filter(Boolean) : [];

  // Parse active dynamic attribute filters
  const activeAttrs: Record<string, string[]> = useMemo(() => {
    const raw = searchParams.get("attrs");
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const result: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (Array.isArray(v)) result[k] = (v as unknown[]).map(String);
        else if (typeof v === "string" && v) result[k] = [v];
      }
      return result;
    } catch {
      return {};
    }
  }, [searchParams]);

  if (q) {
    chips.push({ label: `"${q}"`, remove: () => removeParam("q") });
  }
  if (category) {
    // Use server-resolved name when available; fall back to slug-derived title
    const catLabel = categoryLabel ?? titleCase(category);
    chips.push({ label: catLabel, remove: () => removeParam("category", "subcategory", "attrs") });
  }
  if (subcategory) {
    chips.push({ label: subcategory, remove: () => removeParam("subcategory") });
  }
  brands.forEach((brand) => {
    chips.push({ label: brand, remove: () => removeFromList("brand", brand) });
  });
  // Price chip: only shown when BOTH bounds are present (matches backend validation)
  if (minPrice && maxPrice) {
    chips.push({
      label:  `₹${minPrice} – ₹${maxPrice}`,
      remove: () => removeParam("minPrice", "maxPrice"),
    });
  }
  if (ratingRaw) {
    const opt = RATING_OPTIONS.find((r) => r.value === Number(ratingRaw));
    chips.push({
      label:  opt?.label ?? `${ratingRaw}★`,
      remove: () => removeParam("rating"),
    });
  }
  if (discountRaw) {
    const opt = DISCOUNT_OPTIONS.find((d) => d.value === Number(discountRaw));
    chips.push({
      label:  opt?.label ?? `${discountRaw}% off`,
      remove: () => removeParam("discount"),
    });
  }
  if (inStock === "true") {
    chips.push({ label: "In Stock", remove: () => removeParam("inStock") });
  }
  deliveries.forEach((d) => {
    const opt = DELIVERY_OPTIONS.find((o) => o.value === d);
    chips.push({ label: opt?.label ?? d, remove: () => removeFromList("delivery", d) });
  });
  // Dynamic attribute chips — look up human label from cached filter groups
  for (const [attrKey, values] of Object.entries(activeAttrs)) {
    const group = dynamicFilters.find((g) => g.key === attrKey);
    const attrLabel = group?.label ?? attrKey;
    values.forEach((val) => {
      const displayVal = val === "true" ? "Yes" : val === "false" ? "No" : val;
      chips.push({
        label:  `${attrLabel}: ${displayVal}`,
        remove: () => removeAttrValue(attrKey, val),
      });
    });
  }

  if (chips.length === 0) return null;

  return (
    <div
      className="flex flex-wrap gap-2 mb-4"
      aria-label="Active filters"
      data-testid="active-filters"
    >
      {chips.map((chip, i) => (
        <span
          key={`${chip.label}-${i}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 text-[#FCA311] dark:text-amber-400 text-sm font-medium rounded-full border border-amber-200 dark:border-amber-800/40"
        >
          {chip.label}
          <button
            onClick={chip.remove}
            aria-label={`Remove ${chip.label} filter`}
            className="hover:text-[#E8920A] transition-colors"
            data-testid={`remove-filter-${chip.label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}
