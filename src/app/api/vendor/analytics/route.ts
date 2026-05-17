import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import ProductModel from "@/lib/db/models/product.model";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    if (!mongoose.isValidObjectId(auth.vendorId)) {
      return NextResponse.json({ success: false, error: "Invalid vendor" }, { status: 400 });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(auth.vendorId);

    const [orderAgg, topProducts, revenueByMonth, totalProducts] = await Promise.all([
      // Total revenue + order counts from orders containing this vendor's items
      OrderModel.aggregate<{
        totalRevenue: number;
        totalOrders: number;
        pendingOrders: number;
      }>([
        { $match: { "items.vendorId": vendorObjectId } },
        {
          $group: {
            _id:           null,
            totalRevenue:  { $sum: "$total" },
            totalOrders:   { $sum: 1 },
            pendingOrders: {
              $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
            },
          },
        },
      ]),

      // Top 5 products by revenue (using only this vendor's items in orders)
      OrderModel.aggregate<{ name: string; slug: string; revenue: number; quantity: number }>([
        { $match: { "items.vendorId": vendorObjectId } },
        { $unwind: "$items" },
        { $match: { "items.vendorId": vendorObjectId } },
        {
          $group: {
            _id:      "$items.slug",
            name:     { $first: "$items.name" },
            slug:     { $first: "$items.slug" },
            revenue:  { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            quantity: { $sum: "$items.quantity" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        { $project: { _id: 0, name: 1, slug: 1, revenue: 1, quantity: 1 } },
      ]),

      // Monthly revenue for the last 6 months
      OrderModel.aggregate<{ month: string; revenue: number }>([
        {
          $match: {
            "items.vendorId": vendorObjectId,
            createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
          },
        },
        {
          $group: {
            _id:     { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$total" },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: "$_id", revenue: 1 } },
      ]),

      ProductModel.countDocuments({ vendorId: vendorObjectId }),
    ]);

    const agg = orderAgg[0] ?? { totalRevenue: 0, totalOrders: 0, pendingOrders: 0 };

    return NextResponse.json({
      success: true,
      data: {
        totalRevenue:   agg.totalRevenue,
        totalOrders:    agg.totalOrders,
        pendingOrders:  agg.pendingOrders,
        totalProducts,
        topProducts,
        revenueByMonth,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
