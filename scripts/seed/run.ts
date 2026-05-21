/**
 * Full marketplace seed script.
 *
 * Execution order:
 *   1. Connect to MongoDB
 *   2. Seed 3-level category hierarchy (L1 + L2 under existing L0)
 *   3. Delete all existing products
 *   4. Generate and insert 10 products per L2 category
 *   5. Update productCount on each category
 *   6. Seed CommissionConfig singleton
 *
 * Run:
 *   npm run seed:full
 */

import * as path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { connectDB } from "../../src/lib/db/mongoose";
import ProductModel from "../../src/lib/db/models/product.model";
import CategoryModel from "../../src/lib/db/models/category.model";
import CommissionConfigModel from "../../src/lib/db/models/commission-config.model";
import { VENDOR_IDS } from "../../src/lib/data/seeds/ids";
import { FULL_TREE } from "./categories";
import { seedCategories } from "./categories";
import { seedProducts } from "./products";

// ─── Commission config ────────────────────────────────────────────────────────

const VENDOR_RATES = [
  { vendorId: VENDOR_IDS.RAJ_FRESH_FARMS, rate: 8  },
  { vendorId: VENDOR_IDS.GOLDEN_CRUST,    rate: 9  },
  { vendorId: VENDOR_IDS.DAIRY_BELLE,     rate: 8  },
  { vendorId: VENDOR_IDS.OCEAN_PASTURE,   rate: 9  },
  { vendorId: VENDOR_IDS.SIP_REFRESH,     rate: 10 },
  { vendorId: VENDOR_IDS.CRUNCH_MUNCH,    rate: 10 },
  { vendorId: VENDOR_IDS.POLAR_ICE,       rate: 10 },
  { vendorId: VENDOR_IDS.PURE_EARTH,      rate: 9  },
  { vendorId: VENDOR_IDS.WORLD_KITCHEN,   rate: 11 },
  { vendorId: VENDOR_IDS.CLEAN_HOME,      rate: 10 },
  { vendorId: VENDOR_IDS.TECH_ZONE,       rate: 12 },
  { vendorId: VENDOR_IDS.STYLE_STUDIO,    rate: 11 },
  { vendorId: VENDOR_IDS.PLAY_WORLD,      rate: 10 },
  { vendorId: VENDOR_IDS.GARDEN_PRO,      rate: 10 },
  { vendorId: VENDOR_IDS.HEALTH_PLUS,     rate: 9  },
];

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

  // ── Step 1: Seed category hierarchy ─────────────────────────────────────────
  console.log("📂  Step 1/4 — Seeding category hierarchy...");
  await seedCategories();

  // ── Step 2: Delete existing products ────────────────────────────────────────
  console.log("\n🗑️   Step 2/4 — Removing existing products...");
  const { deletedCount } = await ProductModel.deleteMany({});
  console.log(`   Deleted ${deletedCount} products`);

  // ── Step 3: Seed products ────────────────────────────────────────────────────
  console.log("\n📦  Step 3/4 — Generating & inserting products...");
  const totalProducts = await seedProducts(FULL_TREE);
  console.log(`\n   ✅  ${totalProducts} products inserted`);

  // ── Step 4: Update productCount per category ─────────────────────────────────
  console.log("\n🔢  Step 4/4 — Updating category product counts...");
  const countPipeline = await ProductModel.aggregate([
    { $match: { status: "approved" } },
    { $group: { _id: "$subcategory", count: { $sum: 1 } } },
  ]);

  const subcatCounts = new Map<string, number>(
    countPipeline.map((r: { _id: string; count: number }) => [r._id, r.count])
  );

  // Update L2 counts
  const l2Updates = await Promise.all(
    Array.from(subcatCounts.entries()).map(([name, count]) =>
      CategoryModel.updateMany({ name, level: 2 }, { $set: { productCount: count } })
    )
  );
  const l2Updated = l2Updates.reduce((s, r) => s + r.modifiedCount, 0);

  // Update L1 counts (sum of their L2 children)
  const l1Cats = await CategoryModel.find({ level: 1 }).select("_id name").lean();
  for (const l1 of l1Cats) {
    const l2Children = await CategoryModel.find({ parentId: l1._id, level: 2 }).select("productCount").lean();
    const total = l2Children.reduce((s, c) => s + (c.productCount ?? 0), 0);
    await CategoryModel.findByIdAndUpdate(l1._id, { productCount: total });
  }

  // Update L0 counts (sum of their L1 children)
  const l0Cats = await CategoryModel.find({ level: 0 }).select("_id name").lean();
  for (const l0 of l0Cats) {
    const l1Children = await CategoryModel.find({ parentId: l0._id, level: 1 }).select("productCount").lean();
    const total = l1Children.reduce((s, c) => s + (c.productCount ?? 0), 0);
    await CategoryModel.findByIdAndUpdate(l0._id, { productCount: total });
  }

  console.log(`   Updated productCount on ${l2Updated} L2 categories + all L1/L0 roll-ups`);

  // ── Commission config ────────────────────────────────────────────────────────
  await CommissionConfigModel.findOneAndUpdate(
    { _id: "singleton" },
    {
      $set: {
        defaultRate: 10,
        vendorRates: VENDOR_RATES.map(({ vendorId, rate }) => ({
          vendorId: new mongoose.Types.ObjectId(vendorId),
          rate,
        })),
      },
    },
    { upsert: true }
  );
  console.log("   ✅  CommissionConfig upserted");

  // ── Summary ──────────────────────────────────────────────────────────────────
  const catTotal = await CategoryModel.countDocuments();
  const prodTotal = await ProductModel.countDocuments();

  console.log("\n─────────────────────────────────────────");
  console.log(`✅  Seed complete`);
  console.log(`   Categories : ${catTotal}`);
  console.log(`   Products   : ${prodTotal}`);
  console.log("─────────────────────────────────────────\n");

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("❌  Seed failed:", err);
  process.exit(1);
});
