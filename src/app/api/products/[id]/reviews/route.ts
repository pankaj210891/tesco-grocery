import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Review from "@/lib/db/models/review.model";
import ProductModel from "@/lib/db/models/product.model";
import OrderModel from "@/lib/db/models/order.model";
import { getAuthUser } from "@/lib/utils/apiAuth";
import type { RatingSummary } from "@/types";
import mongoose from "mongoose";
import {
  decodeCursor,
  mergeWithKeysetFilter,
  buildKeysetFilter,
  cursorFromDoc,
  encodeCursor,
} from "@/lib/pagination/keyset";

// NOTE: param is named "id" to share the [id] folder, but the value is a slug string
type Params = { params: Promise<{ id: string }> };

async function recalcProduct(productSlug: string) {
  const stats = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { productSlug, isApproved: true } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  const avg   = stats[0]?.avg   ?? 0;
  const count = stats[0]?.count ?? 0;
  await ProductModel.updateOne(
    { slug: productSlug },
    { rating: Math.round(avg * 10) / 10, reviewCount: count }
  );
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await connectDB();
    const { id: slug } = await params;
    const { searchParams } = new URL(req.url);
    const page      = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit     = Math.min(20, Number(searchParams.get("limit") ?? 10));
    const rawCursor = searchParams.get("cursor") ?? "";

    const baseFilter = { productSlug: slug, isApproved: true };

    // Rating distribution and summary are always computed over the full filter
    const [total, dist] = await Promise.all([
      Review.countDocuments(baseFilter),
      Review.aggregate<{ _id: number; count: number }>([
        { $match: baseFilter },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1|2|3|4|5, number>;
    dist.forEach((d) => { distribution[d._id as 1|2|3|4|5] = d.count; });

    const average = total > 0
      ? Math.round(([1,2,3,4,5].reduce((s, n) => s + n * distribution[n as 1|2|3|4|5], 0) / total) * 10) / 10
      : 0;

    const summary: RatingSummary = { average, total, distribution };

    // ── Keyset mode ───────────────────────────────────────────────────────────
    const cursorObj = rawCursor ? decodeCursor(rawCursor) : null;

    if (cursorObj && cursorObj.field === "createdAt" && cursorObj.dir === -1) {
      const keysetFilter = buildKeysetFilter(cursorObj, "createdAt");
      const merged       = mergeWithKeysetFilter(
        baseFilter as Record<string, unknown>,
        keysetFilter,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docs = await Review.find(merged as any)
        .sort({ createdAt: -1, _id: -1 })
        .limit(limit + 1)
        .lean();

      const hasMore = docs.length > limit;
      const trimmed = hasMore ? docs.slice(0, limit) : docs;
      const last    = trimmed[trimmed.length - 1];
      const nextCursor = hasMore && last
        ? encodeCursor(cursorFromDoc(last as unknown as Record<string, unknown>, "createdAt", -1))
        : undefined;

      return NextResponse.json({
        success: true,
        data: { reviews: trimmed, summary, nextCursor, hasMore },
      });
    }

    // ── Offset mode (backward compatible) ─────────────────────────────────────
    const skip     = (page - 1) * limit;
    const reviews  = await Review.find(baseFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      data: { reviews, summary, page, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const authUser = getAuthUser(req);
  if (!authUser) return NextResponse.json({ success: false, error: "Sign in to leave a review" }, { status: 401 });

  try {
    await connectDB();
    const { id: slug } = await params;
    const body = await req.json() as { rating: number; title: string; body: string };

    if (!body.rating || body.rating < 1 || body.rating > 5)
      return NextResponse.json({ success: false, error: "Rating must be 1–5" }, { status: 422 });
    if (!body.title?.trim())
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 422 });
    if (!body.body?.trim())
      return NextResponse.json({ success: false, error: "Review text is required" }, { status: 422 });

    const product = await ProductModel.findOne({ slug }).lean<{ _id: mongoose.Types.ObjectId }>();
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    const verifiedOrder = await OrderModel.findOne({
      userId: authUser.userId,
      status: { $in: ["delivered", "shipped"] },
      "items.productId": product._id.toString(),
    }).select("_id").lean();

    if (!verifiedOrder) {
      return NextResponse.json(
        { success: false, error: "You can only review products you have purchased and received" },
        { status: 403 },
      );
    }

    const review = await Review.create({
      productId:          product._id,
      productSlug:        slug,
      userId:             authUser.userId,
      userName:           authUser.name ?? "Customer",
      rating:             body.rating,
      title:              body.title.trim(),
      body:               body.body.trim(),
      isVerifiedPurchase: true,
    });

    await recalcProduct(slug);
    return NextResponse.json({ success: true, data: review }, { status: 201 });
  } catch (err: unknown) {
    const isdup = typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000;
    if (isdup) return NextResponse.json({ success: false, error: "You have already reviewed this product" }, { status: 409 });
    const message = err instanceof Error ? err.message : "Failed to submit review";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
