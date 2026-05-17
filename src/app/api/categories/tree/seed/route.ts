/**
 * POST /api/categories/tree/seed
 *
 * Seeds level-1 and level-2 sub-categories that build the 3-level
 * Department → Sub-Department → Sub-Sub-Department mega menu tree.
 *
 * Safe to re-run — skips slugs that already exist.
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

  // Fetch ALL existing categories to build slug → ObjectId map
  const existing = await CategoryModel.find({}).select("slug _id").lean();
  const slugToId = new Map<string, mongoose.Types.ObjectId>(
    existing.map((d) => [d.slug, d._id as mongoose.Types.ObjectId])
  );

  let inserted = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (const seed of SUBCATEGORY_SEEDS) {
    // Skip if this sub-category already exists
    if (slugToId.has(seed.slug)) {
      skipped++;
      continue;
    }

    // Resolve parent ObjectId
    const parentObjectId = slugToId.get(seed.parentSlug);
    if (!parentObjectId) {
      errors.push(`Parent not found: "${seed.parentSlug}" (needed by "${seed.slug}")`);
      skipped++;
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
        parentId:     parentObjectId, // explicit ObjectId — no string-cast ambiguity
      });

      // Register in map so level-2 items can resolve their level-1 parents
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
    inserted,
    skipped,
    ...(errors.length > 0 && { errors }),
    message: inserted > 0
      ? `Seeded ${inserted} sub-categories. Refresh /api/categories/tree to see the updated tree.`
      : "All sub-categories already exist — nothing inserted.",
  });
}
