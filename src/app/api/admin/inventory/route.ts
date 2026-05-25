import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import { z } from "zod";
import {
  decodeCursor,
  mergeWithKeysetFilter,
  buildKeysetFilter,
  cursorFromDoc,
  encodeCursor,
  type KeysetCursor,
} from "@/lib/pagination/keyset";

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

const INVENTORY_SELECT = "_id name slug category brand inStock stockQuantity lowStockThreshold";

/**
 * Inventory sorts by stockQuantity ASC (nulls first in MongoDB).
 * The keyset cursor uses field="stockQuantity", dir=1 with null-aware filter.
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
    const rawCursor = searchParams.get("cursor") ?? "";

    const query: Record<string, unknown> = {};
    if (search)   query.name = { $regex: search, $options: "i" };
    if (lowStock) {
      query.stockQuantity = { $ne: null };
      query.$expr = { $lte: ["$stockQuantity", "$lowStockThreshold"] };
    }

    const INVENTORY_SORT = { stockQuantity: 1 as const, _id: 1 as const };
    const CURSOR_CFG: Pick<KeysetCursor, "field" | "dir"> = { field: "stockQuantity", dir: 1 };

    // ── Keyset mode ───────────────────────────────────────────────────────────
    const cursorObj = rawCursor ? decodeCursor(rawCursor) : null;

    if (cursorObj && cursorObj.field === "stockQuantity" && cursorObj.dir === 1) {
      const keysetFilter = buildKeysetFilter(cursorObj, "stockQuantity");
      const merged       = mergeWithKeysetFilter(query, keysetFilter);

      const docs = await ProductModel
        .find(merged)
        .select(INVENTORY_SELECT)
        .sort(INVENTORY_SORT)
        .limit(limit + 1)
        .lean();

      const hasMore = docs.length > limit;
      const trimmed = hasMore ? docs.slice(0, limit) : docs;
      const last    = trimmed[trimmed.length - 1];
      const nextCursor = hasMore && last
        ? encodeCursor(cursorFromDoc(last as Record<string, unknown>, CURSOR_CFG.field, CURSOR_CFG.dir))
        : undefined;

      return NextResponse.json({
        success: true,
        data: {
          products: trimmed.map(mapInventory),
          nextCursor,
          hasMore,
        },
      });
    }

    // ── Offset mode (backward compatible) ─────────────────────────────────────
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      ProductModel
        .find(query)
        .select(INVENTORY_SELECT)
        .sort(INVENTORY_SORT)
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products: products.map(mapInventory),
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

function mapInventory(p: Record<string, unknown>) {
  return {
    _id:               (p._id as { toString(): string }).toString(),
    name:              p.name,
    slug:              p.slug,
    category:          p.category,
    brand:             p.brand,
    inStock:           p.inStock,
    stockQuantity:     (p as { stockQuantity?: number | null }).stockQuantity ?? null,
    lowStockThreshold: (p as { lowStockThreshold?: number }).lowStockThreshold ?? 5,
  };
}

/**
 * PATCH /api/admin/inventory — Bulk update stock quantities.
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
