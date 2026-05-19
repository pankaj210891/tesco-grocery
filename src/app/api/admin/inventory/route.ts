import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import { z } from "zod";

function requireAdmin(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth || auth.role !== "admin") return null;
  return auth;
}

const UpdateStockSchema = z.object({
  productId:         z.string(),
  stockQuantity:     z.number().int().min(0).nullable(),
  lowStockThreshold: z.number().int().min(0).optional(),
});

const BulkUpdateSchema = z.object({
  updates: z.array(UpdateStockSchema).min(1),
});

/**
 * GET /api/admin/inventory?page=1&limit=20&lowStock=true
 *
 * Returns product stock levels. Use lowStock=true to filter for items below threshold.
 */
export async function GET(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page      = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit     = Math.min(100, Number(searchParams.get("limit") ?? 20));
    const lowStock  = searchParams.get("lowStock") === "true";
    const search    = searchParams.get("search") ?? "";
    const skip      = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (search) query.name = { $regex: search, $options: "i" };
    if (lowStock) {
      query.stockQuantity = { $ne: null };
      query.$expr = { $lte: ["$stockQuantity", "$lowStockThreshold"] };
    }

    const [products, total] = await Promise.all([
      ProductModel
        .find(query)
        .select("_id name slug category brand inStock stockQuantity lowStockThreshold")
        .sort({ stockQuantity: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products: products.map((p) => ({
          _id:               (p._id as { toString(): string }).toString(),
          name:              p.name,
          slug:              p.slug,
          category:          p.category,
          brand:             p.brand,
          inStock:           p.inStock,
          stockQuantity:     (p as { stockQuantity?: number | null }).stockQuantity ?? null,
          lowStockThreshold: (p as { lowStockThreshold?: number }).lowStockThreshold ?? 5,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[GET /api/admin/inventory]", err);
    return NextResponse.json({ success: false, error: "Failed to fetch inventory" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/inventory
 *
 * Bulk update stock quantities.
 * Body: { updates: [{ productId, stockQuantity, lowStockThreshold? }] }
 */
export async function PATCH(req: NextRequest) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectDB();
    const body   = await req.json();
    const parsed = BulkUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 422 });
    }

    const { updates } = parsed.data;

    await Promise.all(
      updates.map((u) => {
        const set: Record<string, unknown> = { stockQuantity: u.stockQuantity };
        if (u.lowStockThreshold !== undefined) set.lowStockThreshold = u.lowStockThreshold;
        // Auto-set inStock based on stockQuantity
        if (typeof u.stockQuantity === "number") {
          set.inStock = u.stockQuantity > 0;
        }
        return ProductModel.findByIdAndUpdate(u.productId, { $set: set });
      }),
    );

    return NextResponse.json({ success: true, message: `Updated ${updates.length} product(s)` });
  } catch (err) {
    console.error("[PATCH /api/admin/inventory]", err);
    return NextResponse.json({ success: false, error: "Failed to update inventory" }, { status: 500 });
  }
}
