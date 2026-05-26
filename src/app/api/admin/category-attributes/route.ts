import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/apiAuth";
import {
  listCategoryAttributes,
  createCategoryAttributes,
} from "@/services/category-attributes.service";
import { CreateCategoryAttributesSchema } from "@/lib/validations/category-attributes";
import { cacheDel } from "@/lib/redis/cache";
import { CacheKey } from "@/lib/redis/keys";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await listCategoryAttributes();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch category attributes" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateCategoryAttributesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const data = await createCategoryAttributes(parsed.data, auth.userId);
    // New category attributes — bust any pre-existing cache for this category slug
    void cacheDel(CacheKey.categoryAttrs(parsed.data.category.toLowerCase()));
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create";
    if (message.includes("E11000") || message.includes("duplicate")) {
      return NextResponse.json(
        { success: false, error: "Category attributes already exist for this category" },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: false, error: "Failed to create category attributes" }, { status: 500 });
  }
}
