import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
// Register VendorEarning model for $lookup
import "@/lib/db/models/vendor-earning.model";
import { analyticsLimiter, applyRateLimit } from "@/lib/ratelimit";

const querySchema = z.object({
  period: z.enum(["7d", "30d", "90d", "12m", "custom"]).default("30d"),
  from:   z.string().optional(),
  to:     z.string().optional(),
});

function buildDateRange(period: string, from?: string, to?: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date; groupFormat: string } {
  const end   = to   ? new Date(`${to}T23:59:59.999Z`)   : new Date();
  let   start = from ? new Date(`${from}T00:00:00.000Z`) : new Date();

  if (!from) {
    if (period === "7d")  start = new Date(end.getTime() - 7  * 86_400_000);
    if (period === "30d") start = new Date(end.getTime() - 30 * 86_400_000);
    if (period === "90d") start = new Date(end.getTime() - 90 * 86_400_000);
    if (period === "12m") { start = new Date(end); start.setFullYear(start.getFullYear() - 1); }
  }

  const span     = end.getTime() - start.getTime();
  const prevEnd   = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - span);

  // Group by day for ≤31d, by week for ≤91d, by month otherwise
  const days        = span / 86_400_000;
  const groupFormat = days <= 31 ? "%Y-%m-%d" : days <= 91 ? "%Y-%V" : "%Y-%m";

  return { start, end, prevStart, prevEnd, groupFormat };
}

interface PeriodSummary { gross: number; commission: number; vendorNet: number; count: number; }

async function querySummary(match: Record<string, unknown>): Promise<PeriodSummary> {
  const [res] = await OrderModel.aggregate<PeriodSummary>([
    { $match: match },
    {
      $lookup: {
        from:         "vendorearnings",
        localField:   "_id",
        foreignField: "orderId",
        as:           "earningDocs",
      },
    },
    {
      $group: {
        _id:        null,
        gross:      { $sum: "$total" },
        commission: { $sum: { $sum: "$earningDocs.commissionTotal" } },
        vendorNet:  { $sum: { $sum: "$earningDocs.netAmount" } },
        count:      { $sum: 1 },
      },
    },
  ]);
  return res ?? { gross: 0, commission: 0, vendorNet: 0, count: 0 };
}

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

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { period, from, to } = parsed.data;
  await connectDB();

  const { start, end, prevStart, prevEnd, groupFormat } = buildDateRange(period, from, to);

  const currentMatch  = { createdAt: { $gte: start, $lte: end } };
  const previousMatch = { createdAt: { $gte: prevStart, $lte: prevEnd } };

  const [
    current,
    previous,
    revenueByPeriod,
    ordersByStatus,
    topVendors,
    revenueByCategory,
  ] = await Promise.all([
    // ── Current period KPIs ──────────────────────────────────────────────────
    querySummary(currentMatch),

    // ── Previous period KPIs (for trend %) ──────────────────────────────────
    querySummary(previousMatch),

    // ── Revenue over time (area chart) ───────────────────────────────────────
    OrderModel.aggregate<{ date: string; gross: number; commission: number; vendorNet: number }>([
      { $match: currentMatch },
      {
        $lookup: {
          from:         "vendorearnings",
          localField:   "_id",
          foreignField: "orderId",
          as:           "earningDocs",
        },
      },
      {
        $group: {
          _id:        { $dateToString: { format: groupFormat, date: "$createdAt" } },
          gross:      { $sum: "$total" },
          commission: { $sum: { $sum: "$earningDocs.commissionTotal" } },
          vendorNet:  { $sum: { $sum: "$earningDocs.netAmount" } },
        },
      },
      { $sort:    { _id: 1 } },
      { $project: { _id: 0, date: "$_id", gross: 1, commission: 1, vendorNet: 1 } },
    ]),

    // ── Orders by status (bar chart) ─────────────────────────────────────────
    OrderModel.aggregate<{ status: string; count: number }>([
      { $match: currentMatch },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
      { $sort: { count: -1 } },
    ]),

    // ── Top 8 vendors by gross revenue (pie chart) ───────────────────────────
    OrderModel.aggregate<{ vendorId: string; vendorName: string; gross: number; commission: number; net: number }>([
      { $match: currentMatch },
      { $unwind: "$items" },
      { $match: { "items.vendorId": { $ne: null } } },
      {
        $group: {
          _id:        "$items.vendorId",
          vendorName: { $first: "$items.vendorName" },
          gross:      { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          commission: { $sum: "$items.commissionAmount" },
          net:        { $sum: "$items.vendorEarning" },
        },
      },
      { $sort:    { gross: -1 } },
      { $limit:   8 },
      { $project: { _id: 0, vendorId: { $toString: "$_id" }, vendorName: 1, gross: 1, commission: 1, net: 1 } },
    ]),

    // ── Revenue by category (horizontal bar) ─────────────────────────────────
    OrderModel.aggregate<{ category: string; revenue: number }>([
      { $match: currentMatch },
      { $unwind: "$items" },
      {
        $lookup: {
          from:         "products",
          localField:   "items.productId",
          foreignField: "_id",
          as:           "productDoc",
          pipeline:     [{ $project: { category: 1 } }],
        },
      },
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id:     "$productDoc.category",
          revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        },
      },
      { $sort:    { revenue: -1 } },
      { $limit:   8 },
      { $project: { _id: 0, category: "$_id", revenue: 1 } },
    ]),
  ]);

  function round(n: number) { return Math.round(n * 100) / 100; }
  function trend(cur: number, prev: number) {
    if (!prev) return null;
    return Math.round(((cur - prev) / prev) * 100);
  }

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        gross:          round(current.gross),
        commission:     round(current.commission),
        vendorNet:      round(current.vendorNet),
        orderCount:     current.count,
        avgOrderValue:  current.count ? round(current.gross / current.count) : 0,
        trends: {
          gross:      trend(current.gross,      previous.gross),
          commission: trend(current.commission, previous.commission),
          orders:     trend(current.count,      previous.count),
        },
      },
      revenueByPeriod:   revenueByPeriod.map((r) => ({ ...r, gross: round(r.gross), commission: round(r.commission), vendorNet: round(r.vendorNet) })),
      ordersByStatus,
      topVendors:        topVendors.map((v) => ({ ...v, gross: round(v.gross), commission: round(v.commission), net: round(v.net) })),
      revenueByCategory: revenueByCategory.map((c) => ({ ...c, revenue: round(c.revenue) })),
    },
  });
}
