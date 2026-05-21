import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import CategoryModel from "@/lib/db/models/category.model";
import Review from "@/lib/db/models/review.model";
import { slugify } from "@/lib/utils/format";
import { PRODUCTS_PER_PAGE, CATEGORY_NAME_MAP } from "@/constants";
import type { Product, ProductFilters, PaginatedProducts, FilterMeta, ProductVariant } from "@/types";
import {
  isAtlasSearchAvailable,
  atlasSearchProductsPipeline,
} from "@/lib/search/atlas-search";

// ── Category slug resolver ────────────────────────────────────────────────────
// Resolves any category slug (L0 / L1 / L2) to the correct Mongoose filter
// clause.  Products store category = L0 name and subcategory = L2 name, so
// each level maps differently:
//   L0 → { category: "Fresh Food" }
//   L1 → { subcategory: { $in: [all L2 names under this L1] } }
//   L2 → { subcategory: "Salmon & Trout" }
// Falls back to the legacy name-map + regex path when the slug isn't in the DB.
async function resolveCategoryFilter(
  slug: string,
): Promise<Record<string, unknown>> {
  const cat = await CategoryModel.findOne({ slug })
    .select("name level parentId")
    .lean();

  if (!cat) {
    // Not in DB — try CATEGORY_NAME_MAP then slug-to-name regex (legacy path)
    const mapped = CATEGORY_NAME_MAP[slug];
    if (mapped) return { category: mapped };
    const nameFromSlug = slug.replace(/-/g, " ");
    const escaped = nameFromSlug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { category: new RegExp(`^${escaped}$`, "i") };
  }

  if (cat.level === 0) return { category: cat.name };

  if (cat.level === 1) {
    const l2Kids = await CategoryModel.find({ parentId: cat._id, level: 2 })
      .select("name")
      .lean();
    return { subcategory: { $in: l2Kids.map((c) => c.name) } };
  }

  // level === 2
  return { subcategory: cat.name };
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

  const { minPrice, maxPrice } = filters;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: Record<string, any> = {};

  if (slugs && slugs.length > 0) {
    query.slug = { $in: slugs };
  }
  if (category) {
    const catFilter = await resolveCategoryFilter(category);
    Object.assign(query, catFilter);
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
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {};
    if (minPrice !== undefined) query.price.$gte = minPrice;
    if (maxPrice !== undefined) query.price.$lte = maxPrice;
  }
  if (rating !== undefined) {
    // "At least N stars" — $gte so rating=4 returns 4★ and 5★ products
    query.rating = { $gte: rating };
  }
  if (discount !== undefined && discount > 0) {
    // "At least N% off" — $gte so discount=25 returns 25%, 30%, 50% etc.
    // floor(((originalPrice - price) / originalPrice) * 100) >= discount
    query.$expr = {
      $and: [
        { $gt: [{ $ifNull: ["$originalPrice", 0] }, 0] },
        { $gt: ["$originalPrice", "$price"] },
        {
          $gte: [
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

  // ── Atlas Search path (when search term is present and Atlas index is live) ──
  if (search) {
    const atlasAvailable = await isAtlasSearchAvailable();

    if (atlasAvailable) {
      const mongoSort = Object.fromEntries(
        Object.entries(sort).map(([k, v]) => [k, v as 1 | -1])
      );
      const { pipeline, countPipeline } = await atlasSearchProductsPipeline({
        search,
        category:        typeof query.category === "string" ? query.category : undefined,
        brands,
        inStock,
        minPrice,
        maxPrice,
        rating,
        discount,
        deliveryOptions: deliveryOptions as string[] | undefined,
        skip,
        limit,
        sort:            Object.keys(mongoSort).length > 0 ? mongoSort : undefined,
      });

      type CountDoc = { total: number };
      const [docs, countResult] = await Promise.all([
        ProductModel.aggregate<ProductDoc>(pipeline),
        ProductModel.aggregate<CountDoc>(countPipeline),
      ]);
      const total = countResult[0]?.total ?? 0;

      return {
        products:   docs.map(toProduct),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Fallback to $text when Atlas is unavailable
    query.$text = { $search: search };
  }

  // ── Standard Mongoose query path ─────────────────────────────────────────────
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
  const matchFilter: Record<string, unknown> = category
    ? await resolveCategoryFilter(category)
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

// ── Breadcrumb resolver ───────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  slug: string;
  href: string;
}

export async function getCategoryBreadcrumb(slug: string): Promise<BreadcrumbItem[]> {
  await connectDB();

  const cat = await CategoryModel.findOne({ slug })
    .select("name level parentId")
    .lean();

  if (!cat) return [];

  const toItem = (name: string, s: string): BreadcrumbItem => ({
    name,
    slug: s,
    href: `/products?category=${s}`,
  });

  if (cat.level === 0) {
    return [toItem(cat.name, slug)];
  }

  if (cat.level === 1) {
    const l0 = await CategoryModel.findById(cat.parentId)
      .select("name slug")
      .lean();
    return [
      ...(l0 ? [toItem(l0.name, l0.slug)] : []),
      toItem(cat.name, slug),
    ];
  }

  // level === 2
  const l1 = await CategoryModel.findById(cat.parentId)
    .select("name slug parentId")
    .lean();
  const l0 = l1
    ? await CategoryModel.findById(l1.parentId).select("name slug").lean()
    : null;

  return [
    ...(l0 ? [toItem(l0.name, l0.slug)] : []),
    ...(l1 ? [toItem(l1.name, l1.slug)] : []),
    toItem(cat.name, slug),
  ];
}
