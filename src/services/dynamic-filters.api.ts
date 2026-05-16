import type { DynamicFiltersResult, CategoryAttributes } from "@/types";

// ── Dynamic Filters ───────────────────────────────────────────────────────────

export interface DynamicFiltersParams {
  category?:  string;
  search?:    string;
  brand?:     string;
  inStock?:   boolean;
  // Already-selected attribute filters for narrowing
  attrs?:     Record<string, string[]>;
}

export async function fetchDynamicFilters(
  params: DynamicFiltersParams,
): Promise<DynamicFiltersResult> {
  const sp = new URLSearchParams();
  if (params.category)         sp.set("category", params.category);
  if (params.search)           sp.set("q",        params.search);
  if (params.brand)            sp.set("brand",    params.brand);
  if (params.inStock)          sp.set("inStock",  "true");
  if (params.attrs && Object.keys(params.attrs).length > 0) {
    sp.set("attrs", JSON.stringify(params.attrs));
  }

  const res  = await fetch(`/api/products/dynamic-filters?${sp.toString()}`);
  const json = await res.json() as { success: boolean; data?: DynamicFiltersResult; error?: string };
  if (!json.success) throw new Error(json.error ?? "Failed to fetch dynamic filters");
  return json.data ?? { filters: [] };
}

// ── Category Attributes (public) ─────────────────────────────────────────────

export async function fetchCategoryAttributes(
  category: string,
): Promise<CategoryAttributes | null> {
  const res  = await fetch(`/api/category-attributes?category=${encodeURIComponent(category)}`);
  const json = await res.json() as { success: boolean; data?: CategoryAttributes | null; error?: string };
  if (!json.success) return null;
  return json.data ?? null;
}

export async function fetchAllCategoryAttributes(): Promise<CategoryAttributes[]> {
  const res  = await fetch("/api/category-attributes");
  const json = await res.json() as { success: boolean; data?: CategoryAttributes[]; error?: string };
  if (!json.success) return [];
  return json.data ?? [];
}
