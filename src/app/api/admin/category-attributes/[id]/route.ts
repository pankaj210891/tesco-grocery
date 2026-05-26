import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import {
  updateCategoryAttributes,
  deleteCategoryAttributes,
} from "@/services/category-attributes.service";
import { UpdateCategoryAttributesSchema } from "@/lib/validations/category-attributes";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateCategoryAttributesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const data = await updateCategoryAttributes(id, parsed.data, auth.userId);
    if (!data) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update category attributes" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: "Invalid ID" }, { status: 400 });
  }

  try {
    const result = await deleteCategoryAttributes(id);
    if (!result.deleted) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete category attributes" },
      { status: 500 },
    );
  }
}
