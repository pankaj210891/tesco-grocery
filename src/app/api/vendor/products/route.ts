import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import VendorModel from "@/lib/db/models/vendor.model";
import { decodeCursor, findKeyset } from "@/lib/pagination/keyset";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page      = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit     = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const rawCursor = searchParams.get("cursor") ?? "";

    const search   = searchParams.get("search")?.trim() ?? "";
    const category = searchParams.get("category")?.trim() ?? "";
    const inStock  = searchParams.get("inStock") ?? "";
    const badge    = searchParams.get("badge")?.trim() ?? "";
    const sortBy   = searchParams.get("sortBy") ?? "newest";

    const filter: Record<string, unknown> = { vendorId: auth.vendorId };
    if (search)   filter.name     = { $regex: search, $options: "i" };
    if (category) filter.category = category;
    if (badge)    filter.badge    = badge;
    if (inStock === "true")  filter.inStock = true;
    if (inStock === "false") filter.inStock = false;

    const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
      newest:     { createdAt: -1 },
      oldest:     { createdAt:  1 },
      "price-asc":  { price:  1 },
      "price-desc": { price: -1 },
      "name-asc":   { name:   1 },
    };
    const sort = SORT_MAP[sortBy] ?? SORT_MAP.newest;

    // ── Keyset mode ───────────────────────────────────────────────────────────
    const cursorObj = rawCursor ? decodeCursor(rawCursor) : null;

    if (cursorObj) {
      const { docs, nextCursor, hasMore } = await findKeyset({
        model:  ProductModel,
        filter,
        cursor: cursorObj,
        limit,
      });

      return NextResponse.json({
        success: true,
        data: { products: docs, nextCursor, hasMore },
      });
    }

    // ── Offset mode (backward compatible) ─────────────────────────────────────
    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: { products, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json() as Record<string, unknown>;
    const { name, slug, description, price, originalPrice, images, category, brand, unit, inStock, stockQuantity, lowStockThreshold, tags, badge, attributes, variants } = body;

    if (!name || !slug || !description || price === undefined || !category || !brand || !unit) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 422 });
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return NextResponse.json({ success: false, error: "Price must be a positive number" }, { status: 422 });
    }

    if (stockQuantity !== undefined && stockQuantity !== null) {
      const numericStock = Number(stockQuantity);
      if (!Number.isFinite(numericStock) || numericStock < 0) {
        return NextResponse.json({ success: false, error: "Stock quantity must be a non-negative number" }, { status: 422 });
      }
    }

    const safeAttrs: Record<string, string> = {};
    if (attributes && typeof attributes === "object" && !Array.isArray(attributes)) {
      for (const [k, v] of Object.entries(attributes as Record<string, unknown>)) {
        const key = k.replace(/[^a-z0-9_]/gi, "");
        if (key && typeof v === "string" && v.trim()) {
          safeAttrs[key] = v.trim();
        }
      }
    }

    const vendor = await VendorModel.findById(auth.vendorId).lean<{ name: string }>();

    const safeVariants: Array<{ label: string; sku: string; price: number | null; originalPrice: number | null; stockQuantity: number | null; inStock: boolean }> = [];
    if (Array.isArray(variants)) {
      for (const v of variants as unknown[]) {
        if (typeof v !== "object" || v === null) continue;
        const vv = v as Record<string, unknown>;
        if (!vv.label || typeof vv.label !== "string" || !vv.label.trim()) continue;
        safeVariants.push({
          label:         vv.label.trim(),
          sku:           typeof vv.sku === "string" ? vv.sku.trim() : "",
          price:         typeof vv.price === "number" ? vv.price : null,
          originalPrice: typeof vv.originalPrice === "number" ? vv.originalPrice : null,
          stockQuantity: typeof vv.stockQuantity === "number" ? vv.stockQuantity : null,
          inStock:       typeof vv.inStock === "boolean" ? vv.inStock : true,
        });
      }
    }

    const product = await ProductModel.create({
      name:          name as string,
      slug:          slug as string,
      description:   description as string,
      price:         price as number,
      originalPrice: (originalPrice as number | null | undefined) ?? null,
      images:        (images as string[] | undefined) ?? [],
      category:      category as string,
      brand:         brand as string,
      unit:          unit as string,
      stockQuantity:     typeof stockQuantity === "number" ? (stockQuantity as number) : null,
      inStock:           typeof stockQuantity === "number" ? (stockQuantity as number) > 0 : ((inStock as boolean | undefined) ?? true),
      lowStockThreshold: typeof lowStockThreshold === "number" ? (lowStockThreshold as number) : 5,
      tags:          (tags as string[] | undefined) ?? [],
      badge:         (badge as "NEW" | "HOT" | "LIMITED" | "ORGANIC" | "EXCLUSIVE" | "SALE" | null | undefined) ?? null,
      vendorId:      auth.vendorId,
      vendorName:    vendor?.name ?? null,
      attributes:    safeAttrs,
      variants:      safeVariants,
      rating: 0,
      reviewCount: 0,
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err: unknown) {
    const isdup = typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000;
    if (isdup) return NextResponse.json({ success: false, error: "A product with this slug already exists" }, { status: 409 });
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 });
  }
}
