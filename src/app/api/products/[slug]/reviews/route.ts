import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Review from "@/lib/db/models/review.model";
import ProductModel from "@/lib/db/models/product.model";
import { getAuthUser } from "@/lib/utils/apiAuth";
import type { RatingSummary } from "@/types";

type Params = { params: Promise<{ slug: string }> };

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
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit = Math.min(20, Number(searchParams.get("limit") ?? 10));
    const skip  = (page - 1) * limit;

    const [reviews, total, dist] = await Promise.all([
      Review.find({ productSlug: slug, isApproved: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ productSlug: slug, isApproved: true }),
      Review.aggregate<{ _id: number; count: number }>([
        { $match: { productSlug: slug, isApproved: true } },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1|2|3|4|5, number>;
    dist.forEach((d) => { distribution[d._id as 1|2|3|4|5] = d.count; });

    const average = total > 0
      ? Math.round(([1,2,3,4,5].reduce((s, n) => s + n * distribution[n as 1|2|3|4|5], 0) / total) * 10) / 10
      : 0;

    const summary: RatingSummary = { average, total, distribution };

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
    const { slug } = await params;
    const body = await req.json() as { rating: number; title: string; body: string };

    if (!body.rating || body.rating < 1 || body.rating > 5)
      return NextResponse.json({ success: false, error: "Rating must be 1–5" }, { status: 422 });
    if (!body.title?.trim())
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 422 });
    if (!body.body?.trim())
      return NextResponse.json({ success: false, error: "Review text is required" }, { status: 422 });

    const product = await ProductModel.findOne({ slug }).lean<{ _id: import("mongoose").Types.ObjectId }>();
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    const review = await Review.create({
      productId:   product._id,
      productSlug: slug,
      userId:      authUser.userId,
      userName:    authUser.name ?? "Customer",
      rating:      body.rating,
      title:       body.title.trim(),
      body:        body.body.trim(),
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
