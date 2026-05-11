import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import OrderModel from "@/lib/db/models/order.model";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));

    // Find product IDs belonging to this vendor
    const vendorProducts = await ProductModel.find({ vendorId: auth.vendorId }).select("_id slug").lean<{ _id: { toString(): string }; slug: string }[]>();
    const slugs = vendorProducts.map((p) => p.slug);

    const filter = { "items.slug": { $in: slugs } };

    const [orders, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      OrderModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: { orders, total, page, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}
