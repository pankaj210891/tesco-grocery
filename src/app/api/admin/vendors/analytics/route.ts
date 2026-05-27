import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import ProductModel from "@/lib/db/models/product.model";
import VendorModel from "@/lib/db/models/vendor.model";
import { analyticsLimiter, applyRateLimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const rl = await applyRateLimit(analyticsLimiter, auth.userId);
  if (rl.limited) {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } },
    );
  }

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(20, Number(searchParams.get("limit") ?? 10));

    const [vendorRevenue, productCounts] = await Promise.all([
      // Revenue and order counts aggregated per vendor
      OrderModel.aggregate<{
        vendorId:     string;
        totalRevenue: number;
        totalOrders:  number;
      }>([
        { $unwind: "$items" },
        { $match: { "items.vendorId": { $ne: null } } },
        {
          $group: {
            _id:          "$items.vendorId",
            totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            totalOrders:  { $addToSet: "$_id" },
          },
        },
        {
          $project: {
            vendorId:     { $toString: "$_id" },
            totalRevenue: 1,
            totalOrders:  { $size: "$totalOrders" },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: limit },
      ]),

      // Product count per vendor
      ProductModel.aggregate<{ vendorId: string; count: number }>([
        { $match: { vendorId: { $ne: null } } },
        { $group: { _id: "$vendorId", count: { $sum: 1 } } },
        { $project: { vendorId: { $toString: "$_id" }, count: 1 } },
      ]),
    ]);

    // Build product count lookup
    const productMap = new Map(productCounts.map((p) => [p.vendorId, p.count]));

    // Enrich with vendor names and status
    const vendorIds = vendorRevenue.map((v) => v.vendorId);
    const vendors = await VendorModel.find(
      { _id: { $in: vendorIds } },
      { name: 1, status: 1 },
    ).lean<{ _id: { toString(): string }; name: string; status: string }[]>();

    const vendorMap = new Map(vendors.map((v) => [v._id.toString(), v]));

    const topVendors = vendorRevenue.map((v) => ({
      vendorId:      v.vendorId,
      vendorName:    vendorMap.get(v.vendorId)?.name ?? "Unknown",
      status:        vendorMap.get(v.vendorId)?.status ?? "unknown",
      totalProducts: productMap.get(v.vendorId) ?? 0,
      totalOrders:   v.totalOrders,
      totalRevenue:  v.totalRevenue,
    }));

    return NextResponse.json({ success: true, data: topVendors });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch vendor analytics" }, { status: 500 });
  }
}
