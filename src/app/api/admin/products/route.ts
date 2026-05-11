import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit    = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const search   = searchParams.get("search") ?? "";
    const category = searchParams.get("category") ?? "";
    const badge    = searchParams.get("badge") ?? "";
    const vendorId = searchParams.get("vendorId") ?? "";

    const filter: Record<string, unknown> = {};
    if (search)   filter.$text = { $search: search };
    if (category) filter.category = category;
    if (badge)    filter.badge = badge;
    if (vendorId) filter.vendorId = vendorId;

    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort({ createdAt: -1 })
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
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const body = await req.json() as Record<string, unknown>;

    const { name, slug, description, price, originalPrice, images, category, brand, unit, inStock, tags, badge, vendorId, vendorName } = body;

    if (!name || !slug || !description || price === undefined || !category || !brand || !unit) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 422 });
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
      inStock:       (inStock as boolean | undefined) ?? true,
      tags:          (tags as string[] | undefined) ?? [],
      badge:         (badge as "NEW" | "HOT" | "LIMITED" | "ORGANIC" | "EXCLUSIVE" | null | undefined) ?? null,
      vendorId:      (vendorId as string | null | undefined) ?? null,
      vendorName:    (vendorName as string | null | undefined) ?? null,
      rating:        0,
      reviewCount:   0,
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err: unknown) {
    const isdup = typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000;
    if (isdup) return NextResponse.json({ success: false, error: "A product with this slug already exists" }, { status: 409 });
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 });
  }
}
