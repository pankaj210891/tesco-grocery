/**
 * POST /api/seed
 *
 * Quick product-only seed. Kept for backwards compatibility.
 * For a full reseed of all collections use POST /api/seed/master.
 */

import { NextResponse } from "next/server";
import { connectDB }    from "@/lib/db/mongoose";
import ProductModel     from "@/lib/db/models/product.model";
import { PRODUCT_SEEDS }from "@/lib/data/seeds/products.seed";
import mongoose         from "mongoose";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    await connectDB();

    const deleted  = (await ProductModel.deleteMany({})).deletedCount ?? 0;

    const docs = PRODUCT_SEEDS.map((p) => ({
      ...p,
      ...(p.vendorId
        ? { vendorId: new mongoose.Types.ObjectId(p.vendorId) }
        : { vendorId: null }),
    }));

    const inserted = (await ProductModel.insertMany(docs)).length;

    return NextResponse.json({
      success: true,
      message: `Seeded ${inserted} products (deleted ${deleted}).`,
      tip:     "Run POST /api/seed/master to seed all collections.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
