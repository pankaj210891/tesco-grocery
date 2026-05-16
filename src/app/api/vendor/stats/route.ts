import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import OrderModel from "@/lib/db/models/order.model";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    if (!mongoose.isValidObjectId(auth.vendorId)) {
      return NextResponse.json({ success: false, error: "Invalid vendor" }, { status: 400 });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(auth.vendorId);

    const [totalProducts, inStockProducts, outOfStockProducts, totalOrders, pendingOrders] = await Promise.all([
      ProductModel.countDocuments({ vendorId: vendorObjectId }),
      ProductModel.countDocuments({ vendorId: vendorObjectId, inStock: true }),
      ProductModel.countDocuments({ vendorId: vendorObjectId, inStock: false }),
      // Use indexed items.vendorId field for efficient lookup
      OrderModel.countDocuments({ "items.vendorId": vendorObjectId }),
      OrderModel.countDocuments({ "items.vendorId": vendorObjectId, status: "pending" }),
    ]);

    return NextResponse.json({
      success: true,
      data: { totalProducts, inStockProducts, outOfStockProducts, totalOrders, pendingOrders },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
