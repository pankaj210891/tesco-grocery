import { apiClient } from "@/lib/axios";
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

  const res = await apiClient.get<{ success: boolean; data?: DynamicFiltersResult; error?: string }>(`/api/products/dynamic-filters?${sp.toString()}`);
  if (!res.data.success) throw new Error(res.data.error ?? "Failed to fetch dynamic filters");
  return res.data.data ?? { filters: [] };
}

// ── Category Attributes (public) ─────────────────────────────────────────────

export async function fetchCategoryAttributes(
  category: string,
): Promise<CategoryAttributes | null> {
  const res = await apiClient.get<{ success: boolean; data?: CategoryAttributes | null }>(`/api/category-attributes?category=${encodeURIComponent(category)}`);
  if (!res.data.success) return null;
  return res.data.data ?? null;
}

export async function fetchAllCategoryAttributes(): Promise<CategoryAttributes[]> {
  const res = await apiClient.get<{ success: boolean; data?: CategoryAttributes[] }>("/api/category-attributes");
  if (!res.data.success) return [];
  return res.data.data ?? [];
}
