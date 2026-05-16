import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import VendorModel from "@/lib/db/models/vendor.model";
import { AdminProductQuerySchema, AdminProductCreateSchema } from "@/lib/validations/admin-filters";

const SORT_MAP: Record<string, Record<string, 1 | -1>> = {
  newest:     { createdAt: -1 },
  oldest:     { createdAt: 1 },
  "price-asc":  { price: 1 },
  "price-desc": { price: -1 },
  rating:     { rating: -1 },
  "name-asc": { name: 1 },
};

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = AdminProductQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const {
    page, limit, search, category, subcategory, brand, vendorId,
    status, badge, inStock, minPrice, maxPrice, rating, discount,
    dateFrom, dateTo, sortBy,
  } = parsed.data;

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};

    if (search)     filter.$text = { $search: search };
    if (category)   filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (brand)      filter.brand = brand;
    if (badge)      filter.badge = badge;
    if (status)     filter.status = status;

    if (vendorId) {
      if (!mongoose.isValidObjectId(vendorId)) {
        return NextResponse.json({ success: false, error: "Invalid vendorId" }, { status: 400 });
      }
      filter.vendorId = new mongoose.Types.ObjectId(vendorId);
    }

    if (inStock !== undefined) filter.inStock = inStock === "true";

    if (minPrice !== undefined && maxPrice !== undefined) {
      filter.price = { $gte: minPrice, $lte: maxPrice };
    }

    if (rating !== undefined) filter.rating = { $gte: rating };

    if (discount !== undefined) {
      filter.originalPrice = { $exists: true, $ne: null, $gt: 0 };
      filter.$expr = {
        $gte: [
          {
            $multiply: [
              { $divide: [{ $subtract: ["$originalPrice", "$price"] }, "$originalPrice"] },
              100,
            ],
          },
          discount,
        ],
      };
    }

    if (dateFrom || dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
      if (dateTo)   dateFilter.$lte = new Date(`${dateTo}T23:59:59.999Z`);
      filter.createdAt = dateFilter;
    }

    const sort = SORT_MAP[sortBy] ?? { createdAt: -1 };

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
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const raw = await req.json() as unknown;

    const parsed = AdminProductCreateSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 422 },
      );
    }

    const { vendorId, ...fields } = parsed.data;

    // Resolve vendor snapshot — admin must assign an active vendor only
    let resolvedVendorId: mongoose.Types.ObjectId | null = null;
    let resolvedVendorName: string | null = null;

    if (vendorId) {
      if (!mongoose.isValidObjectId(vendorId)) {
        return NextResponse.json({ success: false, error: "Invalid vendorId" }, { status: 400 });
      }
      const vendor = await VendorModel.findById(vendorId).select("name status").lean();
      if (!vendor) {
        return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
      }
      if (vendor.status !== "active") {
        return NextResponse.json({ success: false, error: "Vendor is not active" }, { status: 422 });
      }
      resolvedVendorId   = vendor._id as mongoose.Types.ObjectId;
      resolvedVendorName = vendor.name;
    }

    const product = await ProductModel.create({
      ...fields,
      vendorId:    resolvedVendorId,
      vendorName:  resolvedVendorName,
      status:      "approved",
      rating:      0,
      reviewCount: 0,
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err: unknown) {
    const isdup = typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000;
    if (isdup) return NextResponse.json({ success: false, error: "A product with this slug already exists" }, { status: 409 });
    return NextResponse.json({ success: false, error: "Failed to create product" }, { status: 500 });
  }
}
