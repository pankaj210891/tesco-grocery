import { NextRequest, NextResponse } from "next/server";
import { getCategoryAttributesBySlug, getActiveCategoryAttributes } from "@/services/category-attributes.service";

// GET /api/category-attributes?category=mobiles
// Public endpoint — returns attribute schema for a category (vendor/admin product forms + customer filters)
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category")?.toLowerCase().trim();

  try {
    if (category) {
      const data = await getCategoryAttributesBySlug(category);
      if (!data) {
        return NextResponse.json({ success: true, data: null });
      }
      return NextResponse.json({ success: true, data });
    }

    // Return all active schemas (used to build the category→attributes map in product forms)
    const data = await getActiveCategoryAttributes();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch category attributes" },
      { status: 500 },
    );
  }
}
