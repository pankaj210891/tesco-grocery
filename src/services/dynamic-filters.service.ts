import { connectDB } from "@/lib/db/mongoose";
import type { PipelineStage } from "mongoose";
import ProductModel from "@/lib/db/models/product.model";
import { getCategoryAttributesBySlug } from "@/services/category-attributes.service";
import { CATEGORY_NAME_MAP } from "@/constants";
import type { DynamicFilterGroup, DynamicFiltersResult } from "@/types";
import { withCache } from "@/lib/redis/cache";
import { CacheKey, TTL } from "@/lib/redis/keys";
import { brandRegex } from "@/lib/search/search-utils";

interface DynamicFiltersInput {
  category?: string;
  search?:   string;
  brands?:      string[];
  inStock?:     boolean;
  attrs?:       Record<string, string[]>;
}

// ── Dynamic filter computation ────────────────────────────────────────────────
//
// Performance strategy:
//
// OLD: N distinct queries + N*M countDocuments — O(N*M) round-trips to MongoDB.
//
// NEW: Two-phase $facet approach:
//   Phase 1 — one $facet pipeline batching ALL unselected attributes:
//             gets value counts for all attributes the user hasn't filtered on.
//   Phase 2 — one $facet per SELECTED attribute (with self-exclusion):
//             each runs a separate pipeline omitting that attribute's own filter
//             so the user can still see all values for it (multi-select UX).
//
// Result: K+1 MongoDB round-trips instead of N*(M+1), where K = selected attrs
// and K << N in the common case.  Typical page load goes from 20-40 queries to
// 1-3 queries.

async function computeDynamicFilters(
  input: DynamicFiltersInput,
): Promise<DynamicFiltersResult> {
  await connectDB();

  const { category, search, brands, inStock, attrs } = input;

  // ── 1. Resolve category name ─────────────────────────────────────────────────
  const categoryName = category
    ? (CATEGORY_NAME_MAP[category] ?? category)
    : null;

  // ── 2. Fetch attribute schema ────────────────────────────────────────────────
  const schema = category ? await getCategoryAttributesBySlug(category) : null;
  if (!schema || schema.attributes.length === 0) {
    return { filters: [] };
  }

  const filterableAttrs = schema.attributes
    .filter((a) => a.filterable)
    .sort((a, b) => a.order - b.order);

  if (filterableAttrs.length === 0) return { filters: [] };

  // ── 3. Build base match ──────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseMatch: Record<string, any> = { status: "approved" };

  if (categoryName) {
    baseMatch.category = categoryName;
  }
  if (search) {
    // Use $text for filter scoping — consistent with the regex fallback path.
    // When Atlas handles the main product list, filter counts may differ
    // slightly from product counts (Atlas relevance vs. $text) but this is
    // an acceptable tradeoff to avoid a full Atlas facets pipeline here.
    baseMatch.$text = { $search: search };
  }
  if (brands && brands.length > 0) {
    baseMatch.brand = { $in: brands.map(brandRegex) };
  }
  if (inStock) {
    baseMatch.inStock = true;
  }
  if (attrs) {
    for (const [key, values] of Object.entries(attrs)) {
      if (values.length > 0) {
        baseMatch[`attributes.${key}`] = { $in: values };
      }
    }
  }

  // ── 4. Partition attributes into selected vs unselected ───────────────────────
  const selectedKeys   = new Set(Object.keys(attrs ?? {}).filter((k) => (attrs?.[k]?.length ?? 0) > 0));
  const unselectedAttrs = filterableAttrs.filter((a) => !selectedKeys.has(a.key));
  const selectedAttrs   = filterableAttrs.filter((a) => selectedKeys.has(a.key));

  // ── 5. Phase 1 — batch $facet for all unselected attributes ──────────────────
  //
  // A single $facet stage groups by each attribute field simultaneously.
  // Boolean attrs get two countDocuments branches; string/select attrs use $group.
  const unselectedResults: Map<string, DynamicFilterGroup["values"]> = new Map();

  if (unselectedAttrs.length > 0) {
    // Build $facet branches for non-boolean attrs
    const facetBranches: Record<string, PipelineStage[]> = {};

    for (const attr of unselectedAttrs) {
      if (attr.type === "boolean") continue; // handled separately below
      const field = `attributes.${attr.key}`;
      facetBranches[attr.key] = [
        { $match: { [field]: { $exists: true, $ne: "" } } },
        { $group: { _id: `$${field}`, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ];
    }

    const nonBooleanKeys = Object.keys(facetBranches);

    if (nonBooleanKeys.length > 0) {
      const [facetResult] = await ProductModel.aggregate<Record<string, { _id: string; count: number }[]>>([
        { $match: baseMatch },
        { $facet: facetBranches },
      ] as unknown as PipelineStage[]);

      if (facetResult) {
        for (const key of nonBooleanKeys) {
          const rows = facetResult[key] ?? [];
          unselectedResults.set(
            key,
            rows
              .filter((r) => typeof r._id === "string" && r._id.trim().length > 0 && r.count > 0)
              .map((r) => ({ value: r._id, count: r.count })),
          );
        }
      }
    }

    // Boolean attrs: still need two countDocuments (no cleaner way without $cond facet)
    const boolAttrs = unselectedAttrs.filter((a) => a.type === "boolean");
    await Promise.all(
      boolAttrs.map(async (attr) => {
        const field = `attributes.${attr.key}`;
        const [trueCount, falseCount] = await Promise.all([
          ProductModel.countDocuments({ ...baseMatch, [field]: "true" }),
          ProductModel.countDocuments({ ...baseMatch, [field]: "false" }),
        ]);
        const values: DynamicFilterGroup["values"] = [];
        if (trueCount  > 0) values.push({ value: "true",  count: trueCount  });
        if (falseCount > 0) values.push({ value: "false", count: falseCount });
        unselectedResults.set(attr.key, values);
      }),
    );
  }

  // ── 6. Phase 2 — per-selected-attribute $facet with self-exclusion ────────────
  //
  // For each attribute the user has filtered on, we omit that attribute's own
  // filter from the match — this keeps all its values visible for multi-select.
  const selectedResults: Map<string, DynamicFilterGroup["values"]> = new Map();

  await Promise.all(
    selectedAttrs.map(async (attr) => {
      const field = `attributes.${attr.key}`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selfExcludedMatch: Record<string, any> = { ...baseMatch };
      delete selfExcludedMatch[field];

      if (attr.type === "boolean") {
        const [trueCount, falseCount] = await Promise.all([
          ProductModel.countDocuments({ ...selfExcludedMatch, [field]: "true" }),
          ProductModel.countDocuments({ ...selfExcludedMatch, [field]: "false" }),
        ]);
        const values: DynamicFilterGroup["values"] = [];
        if (trueCount  > 0) values.push({ value: "true",  count: trueCount  });
        if (falseCount > 0) values.push({ value: "false", count: falseCount });
        selectedResults.set(attr.key, values);
        return;
      }

      // Single $facet for this attribute (self-excluded match)
      const [facetResult] = await ProductModel.aggregate<Record<string, { _id: string; count: number }[]>>([
        { $match: selfExcludedMatch },
        {
          $facet: {
            [attr.key]: [
              { $match: { [field]: { $exists: true, $ne: "" } } },
              { $group: { _id: `$${field}`, count: { $sum: 1 } } },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ] as unknown as PipelineStage[]);

      const rows = facetResult?.[attr.key] ?? [];
      const activeValues = rows
        .filter((r) => typeof r._id === "string" && r._id.trim().length > 0 && r.count > 0)
        .map((r) => ({ value: r._id, count: r.count }));

      const activeSet = new Set(activeValues.map((v) => v.value));

      // Ghost values: selected by user but currently count=0 due to other filters.
      // Must remain visible so the user can deselect them (Amazon/Flipkart pattern).
      const ghostValues: DynamicFilterGroup["values"] = (attrs?.[attr.key] ?? [])
        .filter((v) => !activeSet.has(v))
        .map((v) => ({ value: v, count: 0 }));

      selectedResults.set(attr.key, [...activeValues, ...ghostValues]);
    }),
  );

  // ── 7. Build response in schema order ────────────────────────────────────────
  const filters: DynamicFilterGroup[] = filterableAttrs
    .map((attr) => {
      const values = selectedResults.get(attr.key) ?? unselectedResults.get(attr.key) ?? [];
      return { key: attr.key, label: attr.label, type: attr.type, values };
    })
    .filter((g) => g.values.length > 0);

  return { filters };
}

/**
 * Public entry point. Redis cache for the base-case only (category, no active
 * filters). Filtered states are always computed fresh to reflect the current
 * result set exactly.
 */
export async function getDynamicFilters(
  input: DynamicFiltersInput,
): Promise<DynamicFiltersResult> {
  const isBaseCase =
    input.category &&
    !input.search &&
    (!input.brands  || input.brands.length  === 0) &&
    !input.inStock  &&
    (!input.attrs   || Object.keys(input.attrs).length === 0);

  if (isBaseCase) {
    return withCache(
      CacheKey.dynamicFilters(input.category!.toLowerCase()),
      TTL.SHORT,
      () => computeDynamicFilters(input),
    );
  }

  return computeDynamicFilters(input);
}
