/**
 * Targeted seed: adds 10 realistic products to every category
 * (L0, L1, L2) that currently has productCount === 0.
 *
 * Safe to run without wiping existing data.
 *
 * Run:
 *   npm run seed:empty
 */

import * as path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { connectDB } from "../../src/lib/db/mongoose";
import ProductModel from "../../src/lib/db/models/product.model";
import CategoryModel from "../../src/lib/db/models/category.model";
import { FULL_TREE } from "./categories";
import { generateProducts } from "./products";
import { toSlug } from "./helpers";

// ─── Meta categories that intentionally have no products ─────────────────────

const NO_SEED_SLUGS = new Set(["marketplace", "kiosk", "inspiration-events"]);

// ─── Build a lookup: L2 category name → { l0Slug, l0Name, l2Name } ──────────

interface L2Meta {
  l0Slug: string;
  l0Name: string;
  l1Name: string;
  l2Name: string;
}

function buildL2Lookup(): Map<string, L2Meta> {
  const map = new Map<string, L2Meta>();
  for (const l0 of FULL_TREE) {
    if (NO_SEED_SLUGS.has(l0.slug)) continue;
    for (const l1 of l0.children) {
      for (const [l2Name] of l1.children) {
        // Key by the l2 category name (matches product.subcategory)
        map.set(l2Name, { l0Slug: l0.slug, l0Name: l0.name, l1Name: l1.name, l2Name });
      }
    }
  }
  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<username>")) {
    console.error("❌  MONGODB_URI not configured in .env.local");
    process.exit(1);
  }

  console.log("\n🔌  Connecting to MongoDB...");
  await connectDB();
  console.log("✅  Connected\n");

  const l2Lookup = buildL2Lookup();

  // ── Step 1: find empty L2 categories ──────────────────────────────────────
  console.log("🔍  Step 1/4 — Finding empty L2 categories...");

  const emptyL2 = await CategoryModel.find({
    level: 2,
    productCount: 0,
  })
    .select("_id name slug parentId")
    .lean();

  // Filter to only those we have a template for
  const seeded = emptyL2.filter((c) => l2Lookup.has(c.name));
  const skipped = emptyL2.length - seeded.length;

  console.log(`   Found ${emptyL2.length} empty L2 categories`);
  if (skipped > 0) console.log(`   Skipping ${skipped} meta/unmapped categories`);
  console.log(`   Will seed ${seeded.length} L2 categories\n`);

  if (seeded.length === 0) {
    console.log("✅  All categories already have products. Nothing to do.");
    await mongoose.disconnect();
    return;
  }

  // ── Step 2: generate & insert products ────────────────────────────────────
  console.log("📦  Step 2/4 — Generating & inserting products...");

  // Get current max SKU counter to avoid collisions
  const latestProduct = await ProductModel.findOne({}, { sku: 1 })
    .sort({ createdAt: -1 })
    .lean();

  // Extract numeric part from last SKU like "PROD-001234"
  let startN = 0;
  if (latestProduct) {
    const totalCount = await ProductModel.countDocuments();
    startN = totalCount;
  }

  const counter = { n: startN };
  const BATCH_SIZE = 200;
  let batch: Record<string, unknown>[] = [];
  let totalInserted = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    await ProductModel.insertMany(batch, { ordered: false });
    totalInserted += batch.length;
    batch = [];
  };

  // Group by L0 for cleaner console output
  const byL0 = new Map<string, typeof seeded>();
  for (const cat of seeded) {
    const meta = l2Lookup.get(cat.name)!;
    const existing = byL0.get(meta.l0Name) ?? [];
    existing.push(cat);
    byL0.set(meta.l0Name, existing);
  }

  for (const [l0Name, cats] of byL0) {
    for (const cat of cats) {
      const meta = l2Lookup.get(cat.name)!;
      const l1Slug = toSlug(`${meta.l0Slug}-${meta.l1Name}`);
      const l2Slug = toSlug(`${l1Slug}-${meta.l2Name}`);

      const products = generateProducts(
        meta.l2Name,
        l2Slug,
        meta.l0Slug,
        meta.l0Name,
        counter,
        meta.l1Name,
      );

      batch.push(...products);
      if (batch.length >= BATCH_SIZE) await flush();
    }
    process.stdout.write(`   ✓ ${l0Name} — seeded ${cats.length} subcategory/ies\n`);
  }

  await flush();
  console.log(`\n   ✅  ${totalInserted} products inserted\n`);

  // ── Step 3: update L2 productCount ────────────────────────────────────────
  console.log("🔢  Step 3/4 — Updating L2 category product counts...");

  for (const cat of seeded) {
    const count = await ProductModel.countDocuments({
      subcategory: cat.name,
      status: "approved",
    });
    await CategoryModel.findByIdAndUpdate(cat._id, { productCount: count });
  }
  console.log(`   Updated ${seeded.length} L2 categories`);

  // ── Step 4: roll up L1 and L0 counts ──────────────────────────────────────
  console.log("\n🔢  Step 4/4 — Rolling up L1 / L0 product counts...");

  // Collect affected L1 IDs (parents of the empty L2 categories we just seeded)
  const affectedL1Ids = [...new Set(seeded.map((c) => String(c.parentId)))];

  for (const l1IdStr of affectedL1Ids) {
    const l1Id = new mongoose.Types.ObjectId(l1IdStr);
    const l2Children = await CategoryModel.find({ parentId: l1Id, level: 2 })
      .select("productCount")
      .lean();
    const total = l2Children.reduce((s, c) => s + (c.productCount ?? 0), 0);
    await CategoryModel.findByIdAndUpdate(l1Id, { productCount: total });
  }

  // Collect affected L0 IDs (parents of the L1 categories we updated)
  const l1Docs = await CategoryModel.find({ _id: { $in: affectedL1Ids } })
    .select("parentId")
    .lean();
  const affectedL0Ids = [...new Set(l1Docs.map((d) => String(d.parentId)))];

  for (const l0IdStr of affectedL0Ids) {
    const l0Id = new mongoose.Types.ObjectId(l0IdStr);
    const l1Children = await CategoryModel.find({ parentId: l0Id, level: 1 })
      .select("productCount")
      .lean();
    const total = l1Children.reduce((s, c) => s + (c.productCount ?? 0), 0);
    await CategoryModel.findByIdAndUpdate(l0Id, { productCount: total });
  }

  console.log(
    `   Updated ${affectedL1Ids.length} L1 and ${affectedL0Ids.length} L0 categories`
  );

  // ── Summary ────────────────────────────────────────────────────────────────
  const prodTotal = await ProductModel.countDocuments();
  const emptyCatsRemaining = await CategoryModel.countDocuments({
    level: 2,
    productCount: 0,
    slug: { $nin: [...NO_SEED_SLUGS] },
  });

  console.log("\n─────────────────────────────────────────");
  console.log("✅  Seed complete");
  console.log(`   Products inserted : ${totalInserted}`);
  console.log(`   Total products    : ${prodTotal}`);
  console.log(`   Empty L2 remaining: ${emptyCatsRemaining} (meta/unmapped)`);
  console.log("─────────────────────────────────────────\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
