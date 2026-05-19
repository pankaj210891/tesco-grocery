import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import Review from "@/lib/db/models/review.model";
import { slugify } from "@/lib/utils/format";
import { PRODUCTS_PER_PAGE, CATEGORY_NAME_MAP } from "@/constants";
import type { Product, ProductFilters, PaginatedProducts, FilterMeta, ProductVariant } from "@/types";

// ── Category slug resolver ────────────────────────────────────────────────────
// CATEGORY_NAME_MAP covers original grocery categories.
// For categories added via seeding (e.g. "mobiles", "gaming-consoles"), the map
// must have an entry OR the fallback below handles it:
//   slug → replace hyphens with spaces → case-insensitive regex
// This prevents silent 0-result bugs when new categories are seeded without a map entry.
function buildCategoryQuery(slug: string): string | RegExp {
  const mapped = CATEGORY_NAME_MAP[slug];
  if (mapped) return mapped; // exact string — index-friendly

  // Fallback: "gaming-consoles" → /^gaming consoles$/i  →  matches "Gaming Consoles"
  const nameFromSlug = slug.replace(/-/g, " ");
  const escaped = nameFromSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}

// ── Serialiser ────────────────────────────────────────────────────────────────

function toProduct(doc: ProductDoc): Product {
  // Deserialise the Mongoose Map back to a plain Record<string, string>
  const rawAttrs = (doc as ProductDoc & { attributes?: unknown }).attributes;
  let attributes: Record<string, string> | undefined;
  if (rawAttrs instanceof Map) {
    attributes = Object.fromEntries(rawAttrs) as Record<string, string>;
  } else if (rawAttrs && typeof rawAttrs === "object") {
    attributes = rawAttrs as Record<string, string>;
  }

  return {
    _id:             doc._id.toString(),
    name:            doc.name,
    slug:            doc.slug,
    description:     doc.description,
    price:           doc.price,
    originalPrice:   doc.originalPrice ?? undefined,
    images:          (doc.images ?? []) as string[],
    category:        doc.category,
    subcategory:     (doc as ProductDoc & { subcategory?: string | null }).subcategory ?? null,
    brand:           doc.brand,
    unit:            doc.unit,
    inStock:         doc.inStock ?? true,
    rating:          doc.rating ?? 0,
    reviewCount:     doc.reviewCount ?? 0,
    tags:            (doc.tags ?? []) as string[],
    badge:           (doc.badge ?? null) as Product["badge"],
    deliveryOptions: (
      (doc as ProductDoc & { deliveryOptions?: string[] }).deliveryOptions ?? ["standard"]
    ) as Product["deliveryOptions"],
    vendorId:        doc.vendorId?.toString() ?? null,
    vendorName:      doc.vendorName ?? null,
    attributes,
    variants: ((doc as ProductDoc & { variants?: unknown[] }).variants ?? []).map(
      (v): ProductVariant => {
        const vv = v as unknown as Record<string, unknown>;
        return {
          _id:           String(vv._id ?? ""),
          label:         String(vv.label ?? ""),
          sku:           String(vv.sku ?? ""),
          price:         (vv.price as number | null | undefined) ?? null,
          originalPrice: (vv.originalPrice as number | null | undefined) ?? null,
          stockQuantity: (vv.stockQuantity as number | null | undefined) ?? null,
          inStock:       (vv.inStock as boolean | undefined) ?? true,
        };
      }
    ),
    createdAt:       doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt:       doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  await connectDB();

  const {
    category, subcategory, brands, inStock,
    rating, discount, deliveryOptions, sortBy, search,
    page = 1, limit = PRODUCTS_PER_PAGE, slugs, attrs,
  } = filters;

  // Price filter: only apply when BOTH bounds are present
  const minPrice = filters.minPrice !== undefined && filters.maxPrice !== undefined
    ? filters.minPrice
    : undefined;
  const maxPrice = filters.minPrice !== undefined && filters.maxPrice !== undefined
    ? filters.maxPrice
    : undefined;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (slugs && slugs.length > 0) {
    query.slug = { $in: slugs };
  }
  if (category) {
    query.category = buildCategoryQuery(category);
  }
  if (subcategory) {
    query.subcategory = subcategory;
  }
  if (brands && brands.length > 0) {
    query.brand = {
      $in: brands.map((b) => new RegExp(`^${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")),
    };
  }
  if (inStock) {
    query.inStock = true;
  }
  if (minPrice !== undefined && maxPrice !== undefined) {
    query.price = { $gte: minPrice, $lte: maxPrice };
  }
  if (rating !== undefined) {
    // Exact integer match: rating=4 returns only products stored with rating === 4
    query.rating = rating;
  }
  if (discount !== undefined && discount > 0) {
    // Exact discount match:
    // 1. Guard: originalPrice must be a positive number and greater than price
    // 2. Compute: floor(((originalPrice - price) / originalPrice) * 100)
    // 3. Match: computed integer discount === requested discount
    // $floor is used so that e.g. 24.9% does NOT match discount=25
    query.$expr = {
      $and: [
        { $gt: [{ $ifNull: ["$originalPrice", 0] }, 0] },
        { $gt: ["$originalPrice", "$price"] },
        {
          $eq: [
            {
              $floor: {
                $multiply: [
                  {
                    $divide: [
                      { $subtract: ["$originalPrice", "$price"] },
                      "$originalPrice",
                    ],
                  },
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
    query.deliveryOptions = { $in: deliveryOptions };
  }
  if (search) {
    query.$text = { $search: search };
  }
  // Dynamic attribute filters — each key maps to one or more values (multiselect → $in)
  if (attrs && Object.keys(attrs).length > 0) {
    for (const [key, values] of Object.entries(attrs)) {
      const sanitizedKey = key.replace(/[^a-z0-9_]/gi, "");
      if (!sanitizedKey || values.length === 0) continue;
      query[`attributes.${sanitizedKey}`] = values.length === 1
        ? values[0]
        : { $in: values };
    }
  }

  type SortSpec = Record<string, mongoose.SortOrder>;
  const sortMap: Record<string, SortSpec> = {
    "price-asc":  { price:        1 as mongoose.SortOrder },
    "price-desc": { price:       -1 as mongoose.SortOrder },
    "rating":     { rating:      -1 as mongoose.SortOrder },
    "newest":     { createdAt:   -1 as mongoose.SortOrder },
    "popularity": { reviewCount: -1 as mongoose.SortOrder },
  };
  const defaultSort: SortSpec = { createdAt: -1 as mongoose.SortOrder };
  const sort = sortBy ? (sortMap[sortBy] ?? defaultSort) : defaultSort;

  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    ProductModel.find(query).sort(sort).skip(skip).limit(limit).lean<ProductDoc[]>(),
    ProductModel.countDocuments(query),
  ]);

  return {
    products:   docs.map(toProduct),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  await connectDB();
  const [doc, liveCount] = await Promise.all([
    ProductModel.findOne({ slug }).lean<ProductDoc>(),
    Review.countDocuments({ productSlug: slug, isApproved: true }),
  ]);
  if (!doc) return null;
  if (doc.reviewCount !== liveCount) {
    void ProductModel.updateOne({ slug }, { reviewCount: liveCount });
  }
  const product = toProduct(doc);
  product.reviewCount = liveCount;
  return product;
}

export async function getAllProductSlugs(): Promise<string[]> {
  await connectDB();
  const docs = await ProductModel.find({}, { slug: 1 }).lean<{ slug: string }[]>();
  return docs.map((d) => d.slug);
}

export async function getCategories(): Promise<{ name: string; slug: string; count: number }[]> {
  await connectDB();
  const rows = await ProductModel.aggregate<{ _id: string; count: number }>([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ name: r._id, slug: slugify(r._id), count: r.count }));
}

export async function getBrands(): Promise<string[]> {
  await connectDB();
  const rows = await ProductModel.distinct("brand");
  return (rows as string[])
    .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
    .sort((a, b) => a.localeCompare(b));
}

export async function getFilterMeta(category?: string): Promise<FilterMeta> {
  await connectDB();

  // Use distinct() for simpler, index-friendly queries instead of $facet
  const matchFilter = category
    ? { category: buildCategoryQuery(category) }
    : {};

  const [brandsRaw, subcatsRaw] = await Promise.all([
    ProductModel.distinct("brand", matchFilter) as Promise<string[]>,
    ProductModel.distinct("subcategory", {
      ...matchFilter,
      subcategory: { $ne: null, $exists: true, $nin: ["", null] },
    }) as Promise<string[]>,
  ]);

  return {
    brands:        brandsRaw
                     .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
                     .sort((a, b) => a.localeCompare(b)),
    subcategories: subcatsRaw
                     .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
                     .sort((a, b) => a.localeCompare(b)),
  };
}
