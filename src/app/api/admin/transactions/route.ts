import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import OrderModel from "@/lib/db/models/order.model";
import "@/lib/db/models/vendor-earning.model";
import {
  decodeCursor,
  mergeWithKeysetFilter,
  buildKeysetFilter,
  cursorFromDoc,
  encodeCursor,
} from "@/lib/pagination/keyset";

const querySchema = z.object({
  page:          z.coerce.number().min(1).default(1),
  limit:         z.coerce.number().min(1).max(100).default(20),
  cursor:        z.string().optional(),
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

const LOOKUP_AND_PROJECT = [
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
] as mongoose.PipelineStage[];

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

  const { page, limit, cursor: rawCursor, from, to, status, paymentStatus, q } = parsed.data;

  await connectDB();

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

  // Summary is always computed on the full filter (not keyset-scoped)
  const summaryPipeline: mongoose.PipelineStage[] = [
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
  ];

  // ── Keyset mode ─────────────────────────────────────────────────────────────
  const cursorObj = rawCursor ? decodeCursor(rawCursor) : null;

  if (cursorObj && cursorObj.field === "createdAt" && cursorObj.dir === -1) {
    const keysetFilter = buildKeysetFilter(cursorObj, "createdAt");
    const merged       = mergeWithKeysetFilter(filter, keysetFilter);

    const [rows, summaryResult] = await Promise.all([
      OrderModel.aggregate<TransactionDoc>([
        { $match: merged },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: limit + 1 },
        ...LOOKUP_AND_PROJECT,
      ]),
      OrderModel.aggregate<SummaryAgg>(summaryPipeline),
    ]);

    const hasMore = rows.length > limit;
    const trimmed = hasMore ? rows.slice(0, limit) : rows;
    const last    = trimmed[trimmed.length - 1];
    const nextCursor = hasMore && last
      ? encodeCursor(cursorFromDoc(last as unknown as Record<string, unknown>, "createdAt", -1))
      : undefined;

    const summary: SummaryAgg = summaryResult[0] ?? {
      grossVolume: 0, platformRevenue: 0, vendorPayout: 0, orderCount: 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        transactions: trimmed.map(mapTransaction),
        nextCursor,
        hasMore,
        summary: formatSummary(summary),
      },
    });
  }

  // ── Offset mode (backward compatible) ──────────────────────────────────────
  const skip = (page - 1) * limit;

  const [rows, countResult, summaryResult] = await Promise.all([
    OrderModel.aggregate<TransactionDoc>([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      ...LOOKUP_AND_PROJECT,
    ]),
    OrderModel.countDocuments(filter),
    OrderModel.aggregate<SummaryAgg>(summaryPipeline),
  ]);

  const summary: SummaryAgg = summaryResult[0] ?? {
    grossVolume: 0, platformRevenue: 0, vendorPayout: 0, orderCount: 0,
  };

  return NextResponse.json({
    success: true,
    data: {
      transactions: rows.map(mapTransaction),
      total:        countResult,
      page,
      totalPages:   Math.ceil(countResult / limit),
      summary:      formatSummary(summary),
    },
  });
}

function mapTransaction(r: TransactionDoc) {
  return {
    _id:             r._id.toString(),
    orderNumber:     r.orderNumber,
    date:            r.createdAt,
    customerName:    r.fullName,
    itemCount:       r.itemCount,
    subtotal:        Math.round((r.subtotal        ?? 0) * 100) / 100,
    total:           Math.round((r.total           ?? 0) * 100) / 100,
    status:          r.status,
    paymentStatus:   r.paymentStatus,
    platformRevenue: Math.round((r.platformRevenue ?? 0) * 100) / 100,
    vendorPayout:    Math.round((r.vendorPayout    ?? 0) * 100) / 100,
  };
}

function formatSummary(s: SummaryAgg) {
  return {
    grossVolume:     Math.round((s.grossVolume     ?? 0) * 100) / 100,
    platformRevenue: Math.round((s.platformRevenue ?? 0) * 100) / 100,
    vendorPayout:    Math.round((s.vendorPayout    ?? 0) * 100) / 100,
    orderCount:      s.orderCount ?? 0,
  };
}
