import type { PipelineStage } from "mongoose";
import ProductModel from "@/lib/db/models/product.model";
import { brandRegex } from "@/lib/search/search-utils";

// ── Availability check (TTL cache — retries after 1 min on failure, 5 min on success) ──

const ATLAS_TTL_UP_MS   = 5 * 60 * 1000;  // 5 min when Atlas is healthy
const ATLAS_TTL_DOWN_MS = 60 * 1000;       // 1 min retry when Atlas is down

let _atlasCache: { result: boolean; expiresAt: number } | null = null;
let _atlasInflight: Promise<boolean> | null = null;

export async function isAtlasSearchAvailable(): Promise<boolean> {
  const now = Date.now();

  if (_atlasCache && now < _atlasCache.expiresAt) {
    return _atlasCache.result;
  }

  // Coalesce concurrent callers onto one in-flight probe
  if (_atlasInflight) return _atlasInflight;

  _atlasInflight = (async () => {
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
      _atlasCache = { result: true,  expiresAt: Date.now() + ATLAS_TTL_UP_MS };
      return true;
    } catch {
      _atlasCache = { result: false, expiresAt: Date.now() + ATLAS_TTL_DOWN_MS };
      return false;
    } finally {
      _atlasInflight = null;
    }
  })();

  return _atlasInflight;
}

// ── Suggestion pipeline (autocomplete + fuzzy on name/brand/subcategory) ──────

export interface SuggestionProduct {
  _id:      string;
  name:     string;
  slug:     string;
  image:    string;
  price:    number;
  category: string;
  brand:    string;
}

export async function atlasSearchSuggestions(q: string): Promise<{
  products: SuggestionProduct[];
  brands:   string[];
}> {
  // Weighted compound query:
  //   name autocomplete  boost:5  — direct name prefix is highest signal
  //   brand autocomplete boost:2  — brand prefix is secondary signal
  //   subcategory autocomplete boost:1 — category-level signal
  // inStock boost: products in stock rank above out-of-stock at equal score
  const pipeline = [
    {
      $search: {
        index: "product_search",
        compound: {
          filter: [{ equals: { path: "status", value: "approved" } }],
          should: [
            {
              autocomplete: {
                query:  q,
                path:   "name",
                fuzzy:  { maxEdits: 1, prefixLength: 2 },
                score:  { boost: { value: 5 } },
              },
            },
            {
              autocomplete: {
                query:  q,
                path:   "brand",
                fuzzy:  { maxEdits: 1, prefixLength: 2 },
                score:  { boost: { value: 2 } },
              },
            },
            {
              autocomplete: {
                query:  q,
                path:   "subcategory",
                fuzzy:  { maxEdits: 1, prefixLength: 2 },
                score:  { boost: { value: 1 } },
              },
            },
            // Boost in-stock products — equals clause in should adds score delta
            {
              equals: {
                path:  "inStock",
                value: true,
                score: { boost: { value: 1.5 } },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    { $limit: 15 },
    {
      $project: {
        _id:      1,
        name:     1,
        slug:     1,
        images:   1,
        price:    1,
        category: 1,
        brand:    1,
        inStock:  1,
        // Atlas score for client-side debugging / future re-ranking
        score: { $meta: "searchScore" },
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
    inStock:  boolean;
    score:    number;
  };

  const docs = await ProductModel.aggregate<Raw>(pipeline);

  const brandSet = new Set<string>();
  const products: SuggestionProduct[] = [];
  const lowerQ = q.toLowerCase();

  for (const d of docs) {
    // Only promote brand to the brands section when brand text starts with query
    // (Atlas matched it via autocomplete edgeGram, so prefix check is reliable)
    if (d.brand && d.brand.toLowerCase().startsWith(lowerQ)) {
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

  return {
    products: products.slice(0, 6),
    brands:   Array.from(brandSet).slice(0, 3),
  };
}

// ── Full-text search pipeline for getProducts ─────────────────────────────────

export interface AtlasSearchParams {
  search:           string;
  category?:        string;
  brands?:          string[];
  inStock?:         boolean;
  minPrice?:        number;
  maxPrice?:        number;
  rating?:          number;
  discount?:        number;
  deliveryOptions?: string[];
  skip:             number;
  limit:            number;
  sort?:            Record<string, 1 | -1>;
}

interface AtlasSearchResult {
  _id:      unknown;
  [key: string]: unknown;
}

export async function atlasSearchProductsPipeline(
  params: AtlasSearchParams
): Promise<{ pipeline: PipelineStage[]; countPipeline: PipelineStage[] }> {
  const {
    search, category, brands, inStock, minPrice, maxPrice,
    rating, discount, deliveryOptions, skip, limit, sort,
  } = params;

  const mustFilters: object[] = [
    { equals: { path: "status", value: "approved" } },
  ];

  if (category) {
    mustFilters.push({
      text: { query: category, path: "category" },
    });
  }

  // Weighted relevance scoring:
  //   autocomplete on name  boost:5  — exact-prefix product name matches are top signal
  //   text on name          boost:4  — full-word matches across the whole name
  //   text on brand         boost:3  — brand name match
  //   text on tags          boost:2  — curated tag match
  //   text on description   boost:1  — broad semantic match
  // inStock + rating boosts applied as should clauses — they add to the
  // relevance score of matching documents without filtering out non-matches.
  const shouldClauses: object[] = [
    {
      autocomplete: {
        query: search,
        path:  "name",
        fuzzy: { maxEdits: 1, prefixLength: 2 },
        score: { boost: { value: 5 } },
      },
    },
    {
      text: {
        query: search,
        path:  "name",
        fuzzy: { maxEdits: 1, prefixLength: 2 },
        score: { boost: { value: 4 } },
      },
    },
    {
      text: {
        query: search,
        path:  "brand",
        fuzzy: { maxEdits: 1, prefixLength: 2 },
        score: { boost: { value: 3 } },
      },
    },
    {
      text: {
        query: search,
        path:  ["tags", "subcategory"],
        fuzzy: { maxEdits: 1, prefixLength: 2 },
        score: { boost: { value: 2 } },
      },
    },
    {
      text: {
        query: search,
        path:  "description",
        fuzzy: { maxEdits: 1, prefixLength: 2 },
        score: { boost: { value: 1 } },
      },
    },
    // Quality signals: in-stock products and higher-rated products rank above
    // equivalent-relevance results (boosts are additive on top of text score).
    {
      equals: {
        path:  "inStock",
        value: true,
        score: { boost: { value: 1.5 } },
      },
    },
    {
      near: {
        path:   "rating",
        origin: 5,
        pivot:  2,
        score:  { boost: { value: 1 } },
      },
    },
  ];

  const searchStage = {
    $search: {
      index: "product_search",
      compound: {
        must:               mustFilters,
        should:             shouldClauses,
        minimumShouldMatch: 1,
      },
    },
  };

  // Post-search $match applies non-text filters without disturbing Atlas scoring.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postMatch: Record<string, any> = {};

  if (inStock) {
    postMatch.inStock = true;
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    postMatch.price = {};
    if (minPrice !== undefined) postMatch.price.$gte = minPrice;
    if (maxPrice !== undefined) postMatch.price.$lte = maxPrice;
  }
  if (brands && brands.length > 0) {
    postMatch.brand = { $in: brands.map(brandRegex) };
  }
  if (rating !== undefined) {
    postMatch.rating = { $gte: rating };
  }
  if (discount !== undefined && discount > 0) {
    postMatch.$expr = {
      $and: [
        { $gt: [{ $ifNull: ["$originalPrice", 0] }, 0] },
        { $gt: ["$originalPrice", "$price"] },
        {
          $gte: [
            {
              $floor: {
                $multiply: [
                  { $divide: [{ $subtract: ["$originalPrice", "$price"] }, "$originalPrice"] },
                  100,
                ],
              },
            },
            discount,
          ],
        },
      ],
    };
  }
  if (deliveryOptions && deliveryOptions.length > 0) {
    postMatch.deliveryOptions = { $in: deliveryOptions };
  }

  const matchStage  = Object.keys(postMatch).length > 0 ? [{ $match: postMatch }] : [];
  // Sort is applied after Atlas scoring. When sort is undefined (relevance mode)
  // Atlas's natural score order is preserved. When user picks price/rating sort,
  // it overrides Atlas order — this is the intended UX.
  const sortStage   = sort ? [{ $sort: sort }] : [];
  const countStage  = { $count: "total" as const };

  const pipeline = [
    searchStage,
    ...matchStage,
    ...sortStage,
    { $skip: skip },
    { $limit: limit },
  ] as unknown as PipelineStage[];

  const countPipeline = [searchStage, ...matchStage, countStage] as unknown as PipelineStage[];

  return { pipeline, countPipeline };
}

export type { AtlasSearchResult };
