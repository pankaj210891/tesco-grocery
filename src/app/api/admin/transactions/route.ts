import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
// Ensure VendorEarning model is registered before the $lookup
import "@/lib/db/models/vendor-earning.model";

const querySchema = z.object({
  page:          z.coerce.number().min(1).default(1),
  limit:         z.coerce.number().min(1).max(100).default(20),
  from:          z.string().optional(),
  to:            z.string().optional(),
  status:        z.string().optional(),
  paymentStatus: z.string().optional(),
  q:             z.string().optional(),
});

interface TransactionDoc {
  _id:             mongoose.Types.ObjectId;
  orderNumber:     string;
  createdAt:       Date;
  fullName:        string;
  itemCount:       number;
  subtotal:        number;
  total:           number;
  status:          string;
  paymentStatus:   string;
  platformRevenue: number;
  vendorPayout:    number;
}

interface SummaryAgg {
  grossVolume:     number;
  platformRevenue: number;
  vendorPayout:    number;
  orderCount:      number;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? "Invalid query" },
      { status: 400 }
    );
  }

  const { page, limit, from, to, status, paymentStatus, q } = parsed.data;

  await connectDB();

  // ── Build filter ──────────────────────────────────────────────────────────
  const filter: Record<string, unknown> = {};
  if (status)        filter.status        = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (q) {
    filter.$or = [
      { orderNumber:         { $regex: q, $options: "i" } },
      { "delivery.fullName": { $regex: q, $options: "i" } },
    ];
  }
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from) range.$gte = new Date(`${from}T00:00:00.000Z`);
    if (to)   range.$lte = new Date(`${to}T23:59:59.999Z`);
    filter.createdAt = range;
  }

  const skip = (page - 1) * limit;

  // ── Paginated transaction list with $lookup join ───────────────────────────
  const [rows, countResult, summaryResult] = await Promise.all([
    OrderModel.aggregate<TransactionDoc>([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from:         "vendorearnings",
          localField:   "_id",
          foreignField: "orderId",
          as:           "earningDocs",
        },
      },
      {
        $project: {
          orderNumber:     1,
          createdAt:       1,
          fullName:        "$delivery.fullName",
          itemCount:       { $size: "$items" },
          subtotal:        1,
          total:           1,
          status:          1,
          paymentStatus:   1,
          platformRevenue: { $sum: "$earningDocs.commissionTotal" },
          vendorPayout:    { $sum: "$earningDocs.netAmount" },
        },
      },
    ]),

    OrderModel.countDocuments(filter),

    // Summary stats for the filtered set
    OrderModel.aggregate<SummaryAgg>([
      { $match: filter },
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
          _id:             null,
          grossVolume:     { $sum: "$total" },
          platformRevenue: { $sum: { $sum: "$earningDocs.commissionTotal" } },
          vendorPayout:    { $sum: { $sum: "$earningDocs.netAmount" } },
          orderCount:      { $sum: 1 },
        },
      },
    ]),
  ]);

  const summary: SummaryAgg = summaryResult[0] ?? {
    grossVolume: 0, platformRevenue: 0, vendorPayout: 0, orderCount: 0,
  };

  const transactions = rows.map((r) => ({
    _id:             r._id.toString(),
    orderNumber:     r.orderNumber,
    date:            r.createdAt,
    customerName:    r.fullName,
    itemCount:       r.itemCount,
    subtotal:        Math.round((r.subtotal ?? 0) * 100) / 100,
    total:           Math.round((r.total    ?? 0) * 100) / 100,
    status:          r.status,
    paymentStatus:   r.paymentStatus,
    platformRevenue: Math.round((r.platformRevenue ?? 0) * 100) / 100,
    vendorPayout:    Math.round((r.vendorPayout    ?? 0) * 100) / 100,
  }));

  return NextResponse.json({
    success: true,
    data: {
      transactions,
      total:      countResult,
      page,
      totalPages: Math.ceil(countResult / limit),
      summary: {
        grossVolume:     Math.round((summary.grossVolume     ?? 0) * 100) / 100,
        platformRevenue: Math.round((summary.platformRevenue ?? 0) * 100) / 100,
        vendorPayout:    Math.round((summary.vendorPayout    ?? 0) * 100) / 100,
        orderCount:      summary.orderCount ?? 0,
      },
    },
  });
}
