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

    const [totalProducts, inStockProducts, outOfStockProducts, totalOrders, pendingOrders] = await Promise.all([
      ProductModel.countDocuments({ vendorId: auth.vendorId }),
      ProductModel.countDocuments({ vendorId: auth.vendorId, inStock: true }),
      ProductModel.countDocuments({ vendorId: auth.vendorId, inStock: false }),
      OrderModel.countDocuments({ "items.vendorId": auth.vendorId }),
      OrderModel.countDocuments({ "items.vendorId": auth.vendorId, status: "pending" }),
    ]);

    return NextResponse.json({
      success: true,
      data: { totalProducts, inStockProducts, outOfStockProducts, totalOrders, pendingOrders },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
