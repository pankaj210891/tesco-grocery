import type { NextRequest } from "next/server";
import { getProducts } from "@/services/product.service";
import type { ProductFilters } from "@/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const filters: ProductFilters = {
    category:  sp.get("category")  ?? undefined,
    search:    sp.get("q")         ?? undefined,
    sortBy:    (sp.get("sortBy") as ProductFilters["sortBy"]) ?? undefined,
    inStock:   sp.get("inStock") === "true" ? true : undefined,
    minPrice:  sp.get("minPrice")  ? Number(sp.get("minPrice"))  : undefined,
    maxPrice:  sp.get("maxPrice")  ? Number(sp.get("maxPrice"))  : undefined,
    page:      sp.get("page")      ? Number(sp.get("page"))      : undefined,
    limit:     sp.get("limit")     ? Number(sp.get("limit"))     : undefined,
  };

  try {
    const data = await getProducts(filters);
    return Response.json({ success: true, data });
  } catch {
    return Response.json({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }
}
