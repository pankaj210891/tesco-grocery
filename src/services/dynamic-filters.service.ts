import { connectDB } from "@/lib/db/mongoose";
import ProductModel from "@/lib/db/models/product.model";
import { getCategoryAttributesBySlug } from "@/services/category-attributes.service";
import { CATEGORY_NAME_MAP } from "@/constants";
import type { DynamicFilterGroup, DynamicFiltersResult } from "@/types";

interface DynamicFiltersInput {
  category?: string;
  search?:   string;
  // Additional base filters to scope values to the current result set
  brands?:      string[];
  inStock?:     boolean;
  attrs?:       Record<string, string[]>;
}

// ── Dynamic filter computation ─────────────────────────────────────────────────
//
// Strategy:
// 1. Resolve the category slug → human-readable name used in products
// 2. Fetch the CategoryAttributes schema for that category
// 3. Build a base product match (category + search + any already-applied attrs)
// 4. For each filterable attribute, run a distinct query to get unique values
//    that exist within the current result set — this mimics Amazon-style
//    "narrowing" filters that show only relevant values.
// 5. Return groups sorted by attribute.order, excluding empty value sets.

export async function getDynamicFilters(
  input: DynamicFiltersInput,
): Promise<DynamicFiltersResult> {
  await connectDB();

  const { category, search, brands, inStock, attrs } = input;

  // ── 1. Resolve category name ────────────────────────────────────────────────
  const categoryName = category
    ? (CATEGORY_NAME_MAP[category] ?? category)
    : null;

  // ── 2. Fetch attribute schema ───────────────────────────────────────────────
  const schema = category ? await getCategoryAttributesBySlug(category) : null;
  if (!schema || schema.attributes.length === 0) {
    return { filters: [] };
  }

  const filterableAttrs = schema.attributes
    .filter((a) => a.filterable)
    .sort((a, b) => a.order - b.order);

  if (filterableAttrs.length === 0) return { filters: [] };

  // ── 3. Build base match ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseMatch: Record<string, any> = { status: "approved" };

  if (categoryName) {
    baseMatch.category = categoryName;
  }
  if (search) {
    baseMatch.$text = { $search: search };
  }
  if (brands && brands.length > 0) {
    baseMatch.brand = {
      $in: brands.map(
        (b) => new RegExp(`^${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      ),
    };
  }
  if (inStock) {
    baseMatch.inStock = true;
  }
  // Apply already-selected attribute filters so remaining filter values narrow correctly
  if (attrs) {
    for (const [key, values] of Object.entries(attrs)) {
      if (values.length > 0) {
        baseMatch[`attributes.${key}`] = { $in: values };
      }
    }
  }

  // ── 4. Distinct queries per filterable attribute ────────────────────────────
  // Run all distinct queries in parallel for performance.
  const distinctQueries = filterableAttrs.map(async (attrDef) => {
    const field = `attributes.${attrDef.key}`;

    // For boolean attrs use ["true","false"], otherwise use distinct
    if (attrDef.type === "boolean") {
      const trueCount  = await ProductModel.countDocuments({ ...baseMatch, [field]: "true" });
      const falseCount = await ProductModel.countDocuments({ ...baseMatch, [field]: "false" });
      const values: DynamicFilterGroup["values"] = [];
      if (trueCount > 0)  values.push({ value: "true",  count: trueCount  });
      if (falseCount > 0) values.push({ value: "false", count: falseCount });
      return { attrDef, values };
    }

    // For select/multiselect/text/number use distinct + count per value
    const rawValues = (await ProductModel.distinct(field, baseMatch)) as unknown[];
    const stringValues = rawValues
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const valueCounts = await Promise.all(
      stringValues.map(async (val) => ({
        value: val,
        count: await ProductModel.countDocuments({ ...baseMatch, [field]: val }),
      })),
    );

    return {
      attrDef,
      values: valueCounts.filter((v) => v.count > 0),
    };
  });

  const results = await Promise.all(distinctQueries);

  // ── 5. Build response ───────────────────────────────────────────────────────
  const filters: DynamicFilterGroup[] = results
    .filter((r) => r.values.length > 0)
    .map((r) => ({
      key:    r.attrDef.key,
      label:  r.attrDef.label,
      type:   r.attrDef.type,
      values: r.values,
    }));

  return { filters };
}
