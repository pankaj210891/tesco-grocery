import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import { requireVendor } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import ProductModel from "@/lib/db/models/product.model";
import { analyticsLimiter, applyRateLimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  const rl = await applyRateLimit(analyticsLimiter, auth.vendorId || auth.userId);
  if (rl.limited) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  try {
    await connectDB();

    if (!mongoose.isValidObjectId(auth.vendorId)) {
      return NextResponse.json({ success: false, error: "Invalid vendor" }, { status: 400 });
    }

    const vendorObjectId = new mongoose.Types.ObjectId(auth.vendorId);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [orderAgg, topProducts, revenueByMonth, totalProducts] = await Promise.all([
      // Use $facet to split order-level counts from item-level revenue in one pass
      OrderModel.aggregate<{
        orderStats: { totalOrders: number; pendingOrders: number }[];
        revenueStats: { totalRevenue: number }[];
      }>([
        { $match: { "items.vendorId": vendorObjectId } },
        {
          $facet: {
            orderStats: [
              {
                $group: {
                  _id:           null,
                  totalOrders:   { $sum: 1 },
                  pendingOrders: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
                },
              },
            ],
            revenueStats: [
              { $unwind: "$items" },
              { $match: { "items.vendorId": vendorObjectId } },
              {
                $group: {
                  _id:          null,
                  totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
                },
              },
            ],
          },
        },
      ]),

      // Top 5 products by revenue (vendor's items only)
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

      // Monthly revenue for the last 6 months — vendor items only
      OrderModel.aggregate<{ month: string; revenue: number }>([
        { $match: { "items.vendorId": vendorObjectId, createdAt: { $gte: sixMonthsAgo } } },
        { $unwind: "$items" },
        { $match: { "items.vendorId": vendorObjectId } },
        {
          $group: {
            _id:     { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, month: "$_id", revenue: 1 } },
      ]),

      ProductModel.countDocuments({ vendorId: vendorObjectId }),
    ]);

    const facet        = orderAgg[0];
    const orderStats   = facet?.orderStats?.[0]   ?? { totalOrders: 0, pendingOrders: 0 };
    const revenueStats = facet?.revenueStats?.[0] ?? { totalRevenue: 0 };
    const agg = { ...orderStats, ...revenueStats };

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
