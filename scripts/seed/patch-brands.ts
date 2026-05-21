/**
 * Patches brand names on existing products so they match the correct
 * L1 category context (e.g. fish brands for Fish & Seafood, fruit brands
 * for Fruits) instead of the generic L0 brand pool used during initial seeding.
 *
 * Safe to run multiple times — uses bulkWrite with deterministic index-based
 * brand assignment, so repeated runs produce the same result.
 *
 * Run:
 *   npm run seed:patch-brands
 */

import * as path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { connectDB } from "../../src/lib/db/mongoose";
import ProductModel from "../../src/lib/db/models/product.model";
import { GROUP_TEMPLATES } from "./products";
import { FULL_TREE } from "./categories";

// ─── Build l2Name → { l0Slug, l1Name } lookup ────────────────────────────────

interface L2Meta { l0Slug: string; l1Name: string }
const NO_SEED_SLUGS = new Set(["marketplace", "kiosk", "inspiration-events"]);

function buildL2Meta(): Map<string, L2Meta> {
  const map = new Map<string, L2Meta>();
  for (const l0 of FULL_TREE) {
    if (NO_SEED_SLUGS.has(l0.slug)) continue;
    for (const l1 of l0.children) {
      for (const [l2Name] of l1.children) {
        map.set(l2Name, { l0Slug: l0.slug, l1Name: l1.name });
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

  const l2Meta = buildL2Meta();

  // Get every unique subcategory (L2 name) that has an override
  const subcategoriesToPatch: string[] = [];
  for (const [l2Name, meta] of l2Meta) {
    const tpl = GROUP_TEMPLATES[meta.l0Slug];
    if (tpl?.l1Overrides?.[meta.l1Name]?.brands) {
      subcategoriesToPatch.push(l2Name);
    }
  }

  console.log(`🔍  Found ${subcategoriesToPatch.length} subcategories with brand overrides to apply\n`);

  let totalPatched = 0;

  for (const subcategory of subcategoriesToPatch) {
    const meta = l2Meta.get(subcategory)!;
    const tpl  = GROUP_TEMPLATES[meta.l0Slug]!;
    const brands = tpl.l1Overrides![meta.l1Name]!.brands!;

    // Fetch all products in this subcategory, ordered consistently
    const products = await ProductModel.find({ subcategory })
      .select("_id brand name")
      .sort({ createdAt: 1 })
      .lean();

    if (products.length === 0) continue;

    const ops = products.map((p, i) => {
      const correctBrand = brands[i % brands.length];
      // Rebuild name: replace old brand prefix with new one
      const newName = p.name.startsWith(p.brand)
        ? p.name.replace(p.brand, correctBrand)
        : `${correctBrand} ${p.name}`;

      return {
        updateOne: {
          filter: { _id: p._id },
          update: { $set: { brand: correctBrand, name: newName } },
        },
      };
    });

    const result = await ProductModel.bulkWrite(ops, { ordered: false });
    totalPatched += result.modifiedCount;
    console.log(
      `   ✓ ${subcategory} — ${result.modifiedCount}/${products.length} products updated (${meta.l1Name})`
    );
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`✅  Patch complete — ${totalPatched} products rebranded`);
  console.log(`─────────────────────────────────────────\n`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌  Patch failed:", err);
  process.exit(1);
});
