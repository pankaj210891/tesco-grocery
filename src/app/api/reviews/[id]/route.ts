import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import Review from "@/lib/db/models/review.model";
import ProductModel from "@/lib/db/models/product.model";
import { getAuthUser } from "@/lib/utils/apiAuth";

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

export async function PUT(req: NextRequest, { params }: Params) {
  const authUser = getAuthUser(req);
  if (!authUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json() as { rating?: number; title?: string; body?: string };

    const review = await Review.findById(id);
    if (!review) return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    if (review.userId.toString() !== authUser.userId)
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    if (body.rating !== undefined) review.rating = body.rating;
    if (body.title  !== undefined) review.title  = body.title.trim();
    if (body.body   !== undefined) review.body   = body.body.trim();
    await review.save();

    await recalcProduct(review.productSlug);
    return NextResponse.json({ success: true, data: review });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update review";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const authUser = getAuthUser(_req);
  if (!authUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { id } = await params;
    const review = await Review.findById(id);
    if (!review) return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 });
    if (review.userId.toString() !== authUser.userId)
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const slug = review.productSlug;
    await review.deleteOne();
    await recalcProduct(slug);
    return NextResponse.json({ success: true, message: "Review deleted" });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete review" }, { status: 500 });
  }
}
