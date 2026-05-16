import { NextRequest, NextResponse } from "next/server";
import { getDynamicFilters } from "@/services/dynamic-filters.service";

// GET /api/products/dynamic-filters?category=mobiles&q=...&brand=...&inStock=true&attrs={"ram":["8GB"]}
// Returns only filter groups with values that exist in the current result set.
export async function GET(req: NextRequest) {
  const sp       = req.nextUrl.searchParams;
  const category = sp.get("category")?.toLowerCase().trim() ?? undefined;
  const search   = sp.get("q")?.trim() ?? undefined;
  const brandRaw = sp.get("brand");
  const inStock  = sp.get("inStock") === "true" ? true : undefined;

  const brands = brandRaw
    ? brandRaw.split(",").map((b) => b.trim()).filter(Boolean)
    : undefined;

  // Parse already-selected attribute filters for narrowing
  let attrs: Record<string, string[]> | undefined;
  const attrsRaw = sp.get("attrs");
  if (attrsRaw) {
    try {
      const parsed = JSON.parse(attrsRaw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        attrs = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (Array.isArray(v)) {
            attrs[k] = (v as unknown[]).map(String).filter(Boolean);
          } else if (typeof v === "string" && v) {
            attrs[k] = [v];
          }
        }
      }
    } catch {
      // Malformed attrs — ignore silently
    }
  }

  try {
    const data = await getDynamicFilters({ category, search, brands, inStock, attrs });
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to compute dynamic filters" },
      { status: 500 },
    );
  }
}
