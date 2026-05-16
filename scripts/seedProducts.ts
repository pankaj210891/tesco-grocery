/**
 * Enterprise Product Seeder
 *
 * Seeds products from src/data/products.json into MongoDB.
 *
 * Features:
 *  - Auto-creates missing categories  (Category collection)
 *  - Auto-registers subcategories & brands  (string-based; no separate model)
 *  - Auto-creates / merges CategoryAttributes for dynamic filter support
 *  - Prevents duplicate product insertion via slug-based bulk dedup
 *  - Bulk insert with ordered:false for performance
 *
 * Run:
 *   npm run seed:products
 */

import path from "path";
import { config } from "dotenv";

// Must load env before any Mongoose imports
config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import CategoryModel from "../src/lib/db/models/category.model";
import CategoryAttributesModel from "../src/lib/db/models/category-attributes.model";
import ProductModel from "../src/lib/db/models/product.model";
import productsRaw from "../src/data/products.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeValue = "NEW" | "HOT" | "LIMITED" | "ORGANIC" | "EXCLUSIVE";
type StatusValue = "pending" | "approved" | "rejected";
type DeliveryOption = "express" | "standard" | "collection";

interface SeedProductInput {
  name: string;
  slug: string;
  description: string;
  price: number;
  originalPrice: number | null;
  images: string[];
  category: string;
  subcategory: string | null;
  brand: string;
  unit: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  badge: BadgeValue | null;
  deliveryOptions: DeliveryOption[];
  status: StatusValue;
  attributes: Record<string, string>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_BADGES = new Set<string>(["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE"]);
const VALID_DELIVERY = new Set<string>(["express", "standard", "collection"]);
const TECH_ABBR = new Set<string>(["ram", "os", "gpu", "cpu", "fps", "ssd", "hdd"]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Converts a camelCase attribute key to a human-readable label.
 * Handles common tech abbreviations: ram → RAM, os → OS, gpu → GPU.
 */
function toAttributeLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .split(/\s+/)
    .map((word) => {
      const lower = word.toLowerCase();
      return TECH_ABBR.has(lower)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ")
    .trim();
}

// ─── In-Memory Registries ─────────────────────────────────────────────────────
// Subcategory and Brand have no dedicated Mongoose model in this codebase.
// They are stored as plain strings on the Product document.
// These registries deduplicate console output and serve as an audit log.

const subcategoryRegistry = new Map<string, string>(); // `${catSlug}::${subName}` → slug
const brandRegistry = new Set<string>();

// ─── Category: Find or Create ─────────────────────────────────────────────────

async function findOrCreateCategory(name: string): Promise<string> {
  const slug = generateSlug(name);

  const existing = await CategoryModel.findOne({ slug }).select("slug").lean();
  if (existing) return existing.slug;

  await CategoryModel.create({ name, slug, isActive: true });
  console.log(`  ✅ Category created:       ${name}  [${slug}]`);
  return slug;
}

// ─── Subcategory: In-Memory Registry ─────────────────────────────────────────

function findOrCreateSubcategory(name: string, categorySlug: string): string {
  const cacheKey = `${categorySlug}::${name.toLowerCase()}`;
  if (!subcategoryRegistry.has(cacheKey)) {
    subcategoryRegistry.set(cacheKey, generateSlug(name));
    console.log(`  ✅ Subcategory registered: ${name}  [under: ${categorySlug}]`);
  }
  return name; // stored as display name on the product document
}

// ─── Brand: In-Memory Registry ────────────────────────────────────────────────

function findOrCreateBrand(name: string): string {
  if (!brandRegistry.has(name)) {
    brandRegistry.add(name);
    console.log(`  ✅ Brand registered:       ${name}`);
  }
  return name;
}

// ─── CategoryAttributes: Create or Merge ─────────────────────────────────────

async function updateCategoryAttributes(
  categorySlug: string,
  categoryName: string,
  attrKeys: Set<string>
): Promise<void> {
  if (attrKeys.size === 0) return;

  const existing = await CategoryAttributesModel.findOne({ category: categorySlug })
    .select("attributes")
    .lean();

  const attrDefs = [...attrKeys].map((key, index) => ({
    key: key.toLowerCase(),
    label: toAttributeLabel(key),
    type: "select" as const,
    filterable: true,
    searchable: false,
    required: false,
    options: [] as string[],
    order: index,
  }));

  if (!existing) {
    await CategoryAttributesModel.create({
      category: categorySlug,
      label: categoryName,
      attributes: attrDefs,
      isActive: true,
    });
    console.log(
      `  ✅ CategoryAttributes created: ${categorySlug}  (${attrKeys.size} attributes)`
    );
    return;
  }

  const existingKeys = new Set(existing.attributes.map((a) => a.key));
  const toAdd = attrDefs.filter((a) => !existingKeys.has(a.key));

  if (toAdd.length > 0) {
    await CategoryAttributesModel.updateOne(
      { category: categorySlug },
      { $push: { attributes: { $each: toAdd } } }
    );
    console.log(
      `  ✅ CategoryAttributes updated: ${categorySlug}  (+${toAdd.length} new attributes)`
    );
  } else {
    console.log(`  ⚠️  CategoryAttributes up-to-date: ${categorySlug}`);
  }
}

// ─── Input Validator ──────────────────────────────────────────────────────────

function validateProductInput(raw: unknown, index: number): SeedProductInput {
  const p = raw as Record<string, unknown>;

  const required: string[] = ["name", "slug", "description", "price", "category", "brand", "unit"];
  for (const field of required) {
    if (p[field] === undefined || p[field] === null || p[field] === "") {
      throw new Error(`Product[${index}] missing required field: "${field}"`);
    }
  }

  const badge = (p.badge as string | null | undefined) ?? null;
  if (badge !== null && !VALID_BADGES.has(badge)) {
    throw new Error(
      `Product[${index}] "${p.name}": invalid badge "${badge}". ` +
        `Valid: ${[...VALID_BADGES].join(", ")}`
    );
  }

  const rawDelivery = (p.deliveryOptions as string[] | undefined) ?? ["standard"];
  const invalidDelivery = rawDelivery.filter((d) => !VALID_DELIVERY.has(d));
  if (invalidDelivery.length > 0) {
    throw new Error(
      `Product[${index}] "${p.name}": invalid deliveryOptions: ${invalidDelivery.join(", ")}`
    );
  }

  return {
    name: p.name as string,
    slug: p.slug as string,
    description: p.description as string,
    price: p.price as number,
    originalPrice: (p.originalPrice as number | null | undefined) ?? null,
    images: (p.images as string[]) ?? [],
    category: p.category as string,
    subcategory: (p.subcategory as string | null | undefined) ?? null,
    brand: p.brand as string,
    unit: p.unit as string,
    inStock: (p.inStock as boolean | undefined) ?? true,
    rating: (p.rating as number | undefined) ?? 0,
    reviewCount: (p.reviewCount as number | undefined) ?? 0,
    tags: (p.tags as string[]) ?? [],
    badge: badge as BadgeValue | null,
    deliveryOptions: rawDelivery as DeliveryOption[],
    status: ((p.status as string | undefined) ?? "approved") as StatusValue,
    attributes: (p.attributes as Record<string, string>) ?? {},
  };
}

// ─── MongoDB Connection ───────────────────────────────────────────────────────

async function connectMongoDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<username>")) {
    throw new Error("MONGODB_URI is not configured. Add it to .env.local and retry.");
  }
  await mongoose.connect(uri, { bufferCommands: false });
  console.log("✅ Connected to MongoDB\n");
}

// ─── Main Seeder ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("═".repeat(62));
  console.log("  Enterprise Product Seeder — Prakash Marketplace");
  console.log("═".repeat(62));
  console.log();

  await connectMongoDB();

  // ── Step 1: Validate all inputs upfront ────────────────────────────────────
  console.log("── Step 1: Validating seed data ─────────────────────────────");
  const products: SeedProductInput[] = (productsRaw as unknown[]).map((p, i) =>
    validateProductInput(p, i)
  );
  console.log(`  ✅ ${products.length} product(s) validated\n`);

  // ── Step 2: Collect category → attribute keys (single pass, no DB hits) ────
  const categoryAttrMap = new Map<string, { name: string; keys: Set<string> }>();
  for (const p of products) {
    const slug = generateSlug(p.category);
    if (!categoryAttrMap.has(slug)) {
      categoryAttrMap.set(slug, { name: p.category, keys: new Set() });
    }
    for (const key of Object.keys(p.attributes)) {
      categoryAttrMap.get(slug)!.keys.add(key);
    }
  }

  // ── Step 3: Ensure categories exist ───────────────────────────────────────
  console.log("── Step 2: Categories ───────────────────────────────────────");
  const categorySlugMap = new Map<string, string>(); // displayName → slug
  for (const p of products) {
    if (!categorySlugMap.has(p.category)) {
      const slug = await findOrCreateCategory(p.category);
      categorySlugMap.set(p.category, slug);
    }
  }
  console.log(`  ✅ ${categorySlugMap.size} category/categories ensured\n`);

  // ── Step 4: Register subcategories & brands (in-memory) ───────────────────
  console.log("── Step 3: Subcategories & Brands ───────────────────────────");
  for (const p of products) {
    const catSlug = categorySlugMap.get(p.category)!;
    if (p.subcategory) findOrCreateSubcategory(p.subcategory, catSlug);
    findOrCreateBrand(p.brand);
  }
  console.log(
    `  ✅ ${subcategoryRegistry.size} subcategory/subcategories, ` +
      `${brandRegistry.size} brand(s) registered\n`
  );

  // ── Step 5: Upsert CategoryAttributes for dynamic filters ──────────────────
  console.log("── Step 4: Category Attributes ──────────────────────────────");
  for (const [slug, { name, keys }] of categoryAttrMap) {
    await updateCategoryAttributes(slug, name, keys);
  }
  console.log();

  // ── Step 6: Bulk slug dedup — single lean query ───────────────────────────
  console.log("── Step 5: Seeding Products ─────────────────────────────────");
  const allSlugs = products.map((p) => p.slug);
  const existingDocs = await ProductModel.find({ slug: { $in: allSlugs } })
    .select("slug")
    .lean();
  const existingSlugs = new Set(existingDocs.map((d) => d.slug));

  const toInsert = products.filter((p) => {
    if (existingSlugs.has(p.slug)) {
      console.log(`  ⚠️  Already exists:        ${p.name}`);
      return false;
    }
    return true;
  });

  // ── Step 7: Bulk insert new products ──────────────────────────────────────
  let created = 0;
  let failed = 0;

  if (toInsert.length > 0) {
    const docs = toInsert.map((p) => ({
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: p.price,
      ...(p.originalPrice !== null ? { originalPrice: p.originalPrice } : {}),
      images: p.images,
      category: p.category,
      subcategory: p.subcategory,
      brand: p.brand,
      unit: p.unit,
      inStock: p.inStock,
      rating: p.rating,
      reviewCount: p.reviewCount,
      tags: p.tags,
      badge: p.badge,
      deliveryOptions: p.deliveryOptions,
      status: p.status,
      attributes: p.attributes,
      vendorId: null,
      vendorName: null,
    }));

    // ordered:false → continues past individual failures; we verify actuals after
    await ProductModel.insertMany(docs, { ordered: false }).catch(
      (err: unknown) => {
        // BulkWriteError is expected when some docs fail (e.g. duplicate key)
        // We deliberately swallow it here and verify results below
        if (err instanceof Error && err.name !== "MongoBulkWriteError") throw err;
      }
    );

    // Verify what actually landed (ground-truth from DB)
    const insertedSlugs = new Set(
      (
        await ProductModel.find({ slug: { $in: toInsert.map((p) => p.slug) } })
          .select("slug")
          .lean()
      ).map((d) => d.slug)
    );

    for (const p of toInsert) {
      if (insertedSlugs.has(p.slug)) {
        console.log(`  ✅ Product seeded:         ${p.name}`);
        created++;
      } else {
        console.log(`  ❌ Failed to insert:       ${p.name}`);
        failed++;
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const skipped = existingSlugs.size;
  console.log();
  console.log("═".repeat(62));
  console.log("  Seeding Summary");
  console.log("─".repeat(62));
  console.log(`  ✅ Created:   ${created}`);
  console.log(`  ⚠️  Skipped:   ${skipped}  (already in DB)`);
  console.log(`  ❌ Failed:    ${failed}`);
  console.log(`  📦 Total:     ${products.length}`);
  console.log("═".repeat(62));
  console.log();

  await mongoose.disconnect();
  console.log("✅ Disconnected. Seeder complete.");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error("\n❌ Fatal error:", message);
  process.exit(1);
});
