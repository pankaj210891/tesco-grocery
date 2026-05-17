import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import VendorModel from "@/lib/db/models/vendor.model";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));

    const [products, total] = await Promise.all([
      ProductModel.find({ vendorId: auth.vendorId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments({ vendorId: auth.vendorId }),
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
    const { name, slug, description, price, originalPrice, images, category, brand, unit, inStock, tags, badge, attributes } = body;

    if (!name || !slug || !description || price === undefined || !category || !brand || !unit) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 422 });
    }

    // Sanitise dynamic attributes — only string key/value pairs allowed
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
      vendorId:      auth.vendorId,
      vendorName:    vendor?.name ?? null,
      attributes:    safeAttrs,
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
