import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import ProductModel, { type ProductDoc } from "@/lib/db/models/product.model";
import Review from "@/lib/db/models/review.model";
import { slugify } from "@/lib/utils/format";
import { PRODUCTS_PER_PAGE, CATEGORY_NAME_MAP } from "@/constants";
import type { Product, ProductFilters, PaginatedProducts } from "@/types";

// ── Serialiser ────────────────────────────────────────────────────────────────

function toProduct(doc: ProductDoc): Product {
  return {
    _id:           doc._id.toString(),
    name:          doc.name,
    slug:          doc.slug,
    description:   doc.description,
    price:         doc.price,
    originalPrice: doc.originalPrice ?? undefined,
    images:        (doc.images ?? []) as string[],
    category:      doc.category,
    brand:         doc.brand,
    unit:          doc.unit,
    inStock:       doc.inStock ?? true,
    rating:        doc.rating ?? 0,
    reviewCount:   doc.reviewCount ?? 0,
    tags:          (doc.tags ?? []) as string[],
    createdAt:     doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt:     doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getProducts(filters: ProductFilters = {}): Promise<PaginatedProducts> {
  await connectDB();

  const {
    category, brand, minPrice, maxPrice, inStock,
    sortBy, search, page = 1, limit = PRODUCTS_PER_PAGE,
    slugs,
  } = filters;

  const query: mongoose.QueryFilter<ProductDoc> = {};

  if (slugs && slugs.length > 0) {
    query.slug = { $in: slugs } as mongoose.QueryFilter<ProductDoc>["slug"];
  }
  if (category) {
    const name = CATEGORY_NAME_MAP[category] ?? category;
    query.category = name;
  }
  if (brand) {
    query.brand = { $regex: brand, $options: "i" } as mongoose.QueryFilter<ProductDoc>["brand"];
  }
  if (inStock) query.inStock = true;
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.price = {} as { $gte?: number; $lte?: number };
    if (minPrice !== undefined) (query.price as Record<string, number>).$gte = minPrice;
    if (maxPrice !== undefined) (query.price as Record<string, number>).$lte = maxPrice;
  }
  if (search) query.$text = { $search: search };

  type SortSpec = Record<string, mongoose.SortOrder>;
  const sortMap: Record<string, SortSpec> = {
    "price-asc":  { price:     1 as mongoose.SortOrder },
    "price-desc": { price:    -1 as mongoose.SortOrder },
    "rating":     { rating:   -1 as mongoose.SortOrder },
    "newest":     { createdAt: -1 as mongoose.SortOrder },
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
  // Keep the stored reviewCount in sync if it drifted (e.g. seeding issues)
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
