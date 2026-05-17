/**
 * POST /api/categories/tree/seed
 *
 * 1. Migrates existing root categories → sets level:0, parentId:null if missing.
 * 2. Deletes any stale sub-category docs whose slugs are in the seed list.
 * 3. Re-inserts all sub-categories with correct parentId and level.
 *
 * Development-only: returns 403 in production.
 */

import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import CategoryModel from "@/lib/db/models/category.model";
import { SUBCATEGORY_SEEDS } from "@/lib/data/seeds/subcategories.seed";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ success: false, error: "Not allowed in production" }, { status: 403 });
  }

  await connectDB();

  // ── Step 1: migrate root categories that are missing level / parentId ────────
  const rootMigration = await CategoryModel.updateMany(
    { level: { $exists: false } },
    { $set: { level: 0, parentId: null } }
  );

  // ── Step 2: delete stale sub-category docs so we can re-insert clean ─────────
  const seedSlugs = SUBCATEGORY_SEEDS.map((s) => s.slug);
  const { deletedCount } = await CategoryModel.deleteMany({ slug: { $in: seedSlugs } });

  // ── Step 3: build slug → ObjectId map from surviving root categories ──────────
  const roots = await CategoryModel.find({}).select("slug _id").lean();
  const slugToId = new Map<string, mongoose.Types.ObjectId>(
    roots.map((d) => [d.slug, d._id as mongoose.Types.ObjectId])
  );

  // ── Step 4: re-insert all sub-categories in seed order ───────────────────────
  let inserted = 0;
  const errors: string[] = [];

  for (const seed of SUBCATEGORY_SEEDS) {
    const parentObjectId = slugToId.get(seed.parentSlug);
    if (!parentObjectId) {
      errors.push(`Parent not found: "${seed.parentSlug}" (needed by "${seed.slug}")`);
      continue;
    }

    try {
      const doc = await CategoryModel.create({
        name:         seed.name,
        slug:         seed.slug,
        emoji:        seed.emoji,
        description:  seed.description,
        color:        seed.color,
        textColor:    seed.textColor,
        order:        seed.order,
        isActive:     true,
        productCount: 0,
        level:        seed.level,
        parentId:     parentObjectId,
      });
      // Register so level-2 items can resolve their level-1 parent in the same loop
      slugToId.set(seed.slug, doc._id as mongoose.Types.ObjectId);
      inserted++;
    } catch (err: unknown) {
      const msg = (err as { code?: number })?.code === 11000
        ? `Duplicate key: ${seed.slug}`
        : String(err);
      errors.push(msg);
    }
  }

  return NextResponse.json({
    success: true,
    rootsMigrated: rootMigration.modifiedCount,
    deleted:  deletedCount,
    inserted,
    ...(errors.length > 0 && { errors }),
    message: [
      rootMigration.modifiedCount > 0 && `${rootMigration.modifiedCount} root categories migrated (level+parentId added)`,
      `${deletedCount} stale sub-categories removed`,
      `${inserted} sub-categories inserted`,
    ].filter(Boolean).join(", ") + ".",
  });
}
