import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import CategoryModel from "@/lib/db/models/category.model";
import { requireAdmin } from "@/lib/utils/apiAuth";

type Ctx = { params: Promise<{ id: string }> };

// PUT /api/admin/categories/[id] — update category
export async function PUT(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await connectDB();

  const body = await req.json() as Record<string, unknown>;
  const allowed = ["name", "slug", "emoji", "description", "color", "textColor", "order", "isActive", "productCount"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  try {
    const doc = await CategoryModel.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!doc) return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: doc });
  } catch (err: unknown) {
    const msg = (err as { code?: number })?.code === 11000
      ? "A category with that name or slug already exists"
      : "Failed to update category";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

// DELETE /api/admin/categories/[id] — delete category
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  await connectDB();

  const doc = await CategoryModel.findByIdAndDelete(id);
  if (!doc) return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });

  return NextResponse.json({ success: true });
}
