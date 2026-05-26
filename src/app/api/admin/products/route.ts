import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import VendorModel from "@/lib/db/models/vendor.model";
import { AdminProductQuerySchema, AdminProductCreateSchema } from "@/lib/validations/admin-filters";
import {
  decodeCursor,
  findKeyset,
  COMMON_SORT_CONFIGS,
  type SortConfig,
} from "@/lib/pagination/keyset";

const SORT_MAP: Record<string, SortConfig> = {
  newest:       COMMON_SORT_CONFIGS.newest,
  oldest:       COMMON_SORT_CONFIGS.oldest,
  "price-asc":  COMMON_SORT_CONFIGS["price-asc"],
  "price-desc": COMMON_SORT_CONFIGS["price-desc"],
  rating:       COMMON_SORT_CONFIGS.rating,
  "name-asc":   COMMON_SORT_CONFIGS["name-asc"],
};

export async function GET(req: NextRequest) {
  const parsed = AdminProductQuerySchema.safeParse(
    Object.fromEntries(new URL(req.url).searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 },
    );
  }

  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const {
    page, limit, cursor: rawCursor,
    search, category, subcategory, brand, vendorId,
    status, badge, inStock, minPrice, maxPrice, rating, discount,
    dateFrom, dateTo, sortBy,
  } = parsed.data;

  try {
    await connectDB();

    const filter: Record<string, unknown> = {};

    if (search)      filter.$text = { $search: search };
    if (category)    filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (brand)       filter.brand = brand;
    if (badge)       filter.badge = badge;
    if (status)      filter.status = status;

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

    const sortCfg = SORT_MAP[sortBy] ?? SORT_MAP.newest;

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
        .sort(sortCfg.sort)
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
