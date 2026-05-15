import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import CategoryModel from "@/lib/db/models/category.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

// GET /api/admin/categories — list all categories
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const sp     = req.nextUrl.searchParams;
  const search = sp.get("q")?.trim() ?? "";
  const query  = search ? { name: { $regex: search, $options: "i" } } : {};

  const docs = await CategoryModel.find(query).sort({ order: 1, name: 1 }).lean();
  return NextResponse.json({ success: true, data: docs });
}

// POST /api/admin/categories — create category
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  await connectDB();
  const body = await req.json() as {
    name?: string; slug?: string; emoji?: string;
    description?: string; color?: string; textColor?: string;
    order?: number; isActive?: boolean;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ success: false, error: "Name is required" }, { status: 400 });
  }
  if (!body.slug?.trim()) {
    return NextResponse.json({ success: false, error: "Slug is required" }, { status: 400 });
  }

  try {
    const doc = await CategoryModel.create({
      name:        body.name.trim(),
      slug:        body.slug.trim().toLowerCase(),
      emoji:       body.emoji ?? "📦",
      description: body.description ?? "",
      color:       body.color ?? "bg-gray-50",
      textColor:   body.textColor ?? "text-gray-700",
      order:       body.order ?? 0,
      isActive:    body.isActive ?? true,
    });
    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (err: unknown) {
    const msg = (err as { code?: number })?.code === 11000
      ? "A category with that name or slug already exists"
      : "Failed to create category";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
