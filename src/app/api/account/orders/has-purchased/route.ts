import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { getAuthUser } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import ProductModel from "@/lib/db/models/product.model";

/**
 * GET /api/account/orders/has-purchased?slug=product-slug
 *
 * Returns { hasPurchased: boolean } — whether the authenticated user has a
 * delivered or shipped order that contains this product (verified purchase check).
 */
export async function GET(req: NextRequest) {
  const auth = getAuthUser(req);
  if (!auth) {
    return NextResponse.json({ success: true, data: { hasPurchased: false } });
  }

  const slug = new URL(req.url).searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ success: false, error: "slug param required" }, { status: 400 });
  }

  try {
    await connectDB();

    const product = await ProductModel.findOne({ slug }).select("_id").lean<{ _id: { toString(): string } }>();
    if (!product) {
      return NextResponse.json({ success: true, data: { hasPurchased: false } });
    }

    const order = await OrderModel.findOne({
      userId: auth.userId,
      status: { $in: ["delivered", "shipped"] },
      "items.productId": product._id.toString(),
    }).select("_id").lean();

    return NextResponse.json({ success: true, data: { hasPurchased: !!order } });
  } catch (err) {
    console.error("[GET /api/account/orders/has-purchased]", err);
    return NextResponse.json({ success: false, error: "Check failed" }, { status: 500 });
  }
}
