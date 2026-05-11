import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import ProductModel from "@/lib/db/models/product.model";
import OrderModel from "@/lib/db/models/order.model";
import UserModel from "@/lib/db/models/user.model";
import VendorModel from "@/lib/db/models/vendor.model";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    const [
      totalProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      totalUsers,
      totalVendors,
      revenueResult,
      recentOrders,
      lowStock,
    ] = await Promise.all([
      ProductModel.countDocuments(),
      OrderModel.countDocuments(),
      OrderModel.countDocuments({ status: "pending" }),
      OrderModel.countDocuments({ status: "processing" }),
      UserModel.countDocuments(),
      VendorModel.countDocuments({ status: "active" }),
      OrderModel.aggregate<{ total: number }>([
        { $match: { status: { $in: ["processing", "shipped", "delivered"] } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      OrderModel.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      ProductModel.find({ inStock: false }).limit(10).select("name slug images price category").lean(),
    ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        totalOrders,
        pendingOrders,
        processingOrders,
        totalUsers,
        totalVendors,
        totalRevenue,
        recentOrders,
        lowStock,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
