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
  // NOTE: level: { $gt: 0 } guards against accidentally wiping root (level-0) categories.
  const seedSlugs = SUBCATEGORY_SEEDS.map((s) => s.slug);
  const { deletedCount } = await CategoryModel.deleteMany({ slug: { $in: seedSlugs }, level: { $gt: 0 } });

  // ── Step 3: build slug → ObjectId map from surviving root categories ──────────
  const roots = await CategoryModel.find({}).select("slug _id").lean();
  const slugToId = new Map<string, mongoose.Types.ObjectId>(
    roots.map((d) => [d.slug, d._id as mongoose.Types.ObjectId])
  );

  // ── Step 3b: patch / restore known root categories that need specific emojis ──
  // Tries multiple slug variants per category so it works regardless of how the
  // admin originally named them (e.g. "gaming-console" vs "gaming-consoles").
  type RootPatch = { name: string; slug: string; altSlugs: string[]; emoji: string; order: number };
  const ROOT_PATCHES: RootPatch[] = [
    { name: "Mobiles",        slug: "mobiles",         altSlugs: ["mobile-phones", "smartphones"],            emoji: "📱", order: 8  },
    { name: "Computers",      slug: "computers",        altSlugs: ["desktops", "desktop-pcs"],                 emoji: "🖥️", order: 9  },
    { name: "Gaming Consoles",slug: "gaming-consoles",  altSlugs: ["gaming-console", "game-consoles"],         emoji: "🕹️", order: 10 },
  ];

  let rootPatched = 0;
  for (const patch of ROOT_PATCHES) {
    const allSlugs = [patch.slug, ...patch.altSlugs];

    // Update emoji for whichever variant already exists at root level
    const updated = await CategoryModel.updateMany(
      { slug: { $in: allSlugs }, level: 0 },
      { $set: { emoji: patch.emoji } },
    );
    rootPatched += updated.modifiedCount;

    // If no root category with any of these slugs exists, create one
    const exists = await CategoryModel.exists({ slug: { $in: allSlugs } });
    if (!exists) {
      await CategoryModel.create({
        name:         patch.name,
        slug:         patch.slug,
        emoji:        patch.emoji,
        description:  "",
        image:        "",
        color:        "bg-blue-50",
        textColor:    "text-blue-700",
        order:        patch.order,
        level:        0,
        parentId:     null,
        isActive:     true,
        productCount: 0,
      });
      rootPatched++;
    }
  }

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
    rootPatched,
    deleted:  deletedCount,
    inserted,
    ...(errors.length > 0 && { errors }),
    message: [
      rootMigration.modifiedCount > 0 && `${rootMigration.modifiedCount} root categories migrated (level+parentId added)`,
      rootPatched > 0 && `${rootPatched} root categories patched/restored with proper emojis`,
      `${deletedCount} stale sub-categories removed`,
      `${inserted} sub-categories inserted`,
    ].filter(Boolean).join(", ") + ".",
  });
}
