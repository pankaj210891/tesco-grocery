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
      pendingProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      totalUsers,
      totalVendors,
      revenueResult,
      recentOrders,
      lowStock,
      topVendorRevenue,
    ] = await Promise.all([
      ProductModel.countDocuments(),
      ProductModel.countDocuments({ status: "pending" }),
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
      ProductModel.find({ inStock: false })
        .limit(10)
        .select("name slug images price category")
        .lean(),
      // Top 5 vendors by revenue
      OrderModel.aggregate<{ vendorId: string; vendorName: string; revenue: number }>([
        { $unwind: "$items" },
        { $match: { "items.vendorId": { $ne: null } } },
        {
          $group: {
            _id:        "$items.vendorId",
            vendorName: { $first: "$items.vendorName" },
            revenue:    { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, vendorId: { $toString: "$_id" }, vendorName: 1, revenue: 1 } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        totalProducts,
        pendingProducts,
        totalOrders,
        pendingOrders,
        processingOrders,
        totalUsers,
        totalVendors,
        totalRevenue,
        recentOrders,
        lowStock,
        topVendorRevenue,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
