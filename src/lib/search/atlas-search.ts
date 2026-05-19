import type { PipelineStage } from "mongoose";
import ProductModel from "@/lib/db/models/product.model";

// ── Availability check (cached per process lifetime) ─────────────────────────

let _availabilityPromise: Promise<boolean> | null = null;

export function isAtlasSearchAvailable(): Promise<boolean> {
  if (_availabilityPromise) return _availabilityPromise;

  _availabilityPromise = (async () => {
    try {
      await ProductModel.aggregate([
        {
          $search: {
            index: "product_search",
            text: { query: "test", path: "name" },
          },
        },
        { $limit: 0 },
      ] as unknown as PipelineStage[]);
      return true;
    } catch {
      return false;
    }
  })();

  return _availabilityPromise;
}

// ── Suggestion pipeline (autocomplete + fuzzy on name/brand) ─────────────────

export interface SuggestionProduct {
  _id:      string;
  name:     string;
  slug:     string;
  image:    string;
  price:    number;
  category: string;
  brand:    string;
}

export interface SuggestionBrand {
  name: string;
}

export async function atlasSearchSuggestions(q: string): Promise<{
  products: SuggestionProduct[];
  brands:   string[];
}> {
  // compound: autocomplete on name + autocomplete on brand (should clause)
  // boost name matches higher than brand matches
  // $search is Atlas-specific; cast to PipelineStage[] for aggregate()
  const pipeline = [
    {
      $search: {
        index: "product_search",
        compound: {
          filter: [{ equals: { path: "status", value: "approved" } }],
          should: [
            {
              autocomplete: {
                query:       q,
                path:        "name",
                fuzzy:       { maxEdits: 1, prefixLength: 2 },
                score:       { boost: { value: 3 } },
              },
            },
            {
              autocomplete: {
                query:       q,
                path:        "brand",
                fuzzy:       { maxEdits: 1, prefixLength: 2 },
                score:       { boost: { value: 1 } },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    { $limit: 12 },
    {
      $project: {
        _id:      1,
        name:     1,
        slug:     1,
        images:   1,
        price:    1,
        category: 1,
        brand:    1,
      },
    },
  ] as unknown as PipelineStage[];

  type Raw = {
    _id:      { toString(): string };
    name:     string;
    slug:     string;
    images?:  string[];
    price:    number;
    category: string;
    brand:    string;
  };

  const docs = await ProductModel.aggregate<Raw>(pipeline);

  const brandSet = new Set<string>();
  const products: SuggestionProduct[] = [];

  for (const d of docs) {
    const lowerQ = q.toLowerCase();
    if (d.brand && d.brand.toLowerCase().includes(lowerQ)) {
      brandSet.add(d.brand);
    }
    products.push({
      _id:      d._id.toString(),
      name:     d.name,
      slug:     d.slug,
      image:    Array.isArray(d.images) ? (d.images[0] ?? "") : "",
      price:    d.price,
      category: d.category,
      brand:    d.brand,
    });
  }

  // Deduplicate products that appeared only for brand matches (show at most 6)
  const uniqueProducts = products.slice(0, 6);

  return {
    products: uniqueProducts,
    brands:   Array.from(brandSet).slice(0, 3),
  };
}

// ── Full-text search pipeline for getProducts ─────────────────────────────────

interface AtlasSearchParams {
  search:     string;
  category?:  string;
  skip:       number;
  limit:      number;
  sort?:      Record<string, 1 | -1>;
}

interface AtlasSearchResult {
  _id:      unknown;
  [key: string]: unknown;
}

export async function atlasSearchProductsPipeline(
  params: AtlasSearchParams
): Promise<{ pipeline: PipelineStage[]; countPipeline: PipelineStage[] }> {
  const { search, category, skip, limit, sort } = params;

  const mustFilters: object[] = [
    { equals: { path: "status", value: "approved" } },
  ];

  if (category) {
    mustFilters.push({
      text: {
        query: category,
        path:  "category",
      },
    });
  }

  const searchStage = {
    $search: {
      index: "product_search",
      compound: {
        must:   mustFilters,
        should: [
          {
            text: {
              query:  search,
              path:   ["name", "brand", "category", "tags", "description"],
              fuzzy:  { maxEdits: 1, prefixLength: 2 },
              score:  { boost: { value: 2 } },
            },
          },
          {
            autocomplete: {
              query:  search,
              path:   "name",
              fuzzy:  { maxEdits: 1, prefixLength: 2 },
              score:  { boost: { value: 3 } },
            },
          },
        ],
        minimumShouldMatch: 1,
      },
    },
  };

  const sortStage  = sort ? [{ $sort: sort }] : [];
  const countStage = { $count: "total" as const };

  // $search is an Atlas-specific stage not in Mongoose's PipelineStage union;
  // cast required for aggregate() compatibility.
  const pipeline = [
    searchStage,
    ...sortStage,
    { $skip: skip },
    { $limit: limit },
  ] as unknown as PipelineStage[];

  const countPipeline = [searchStage, countStage] as unknown as PipelineStage[];

  return { pipeline, countPipeline };
}

export type { AtlasSearchResult };
