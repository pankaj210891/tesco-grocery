import type { NextRequest } from "next/server";
import { getProducts } from "@/services/product.service";
import { ProductFiltersSchema } from "@/lib/validations/product-filters";
import type { DeliveryOption, ProductFilters } from "@/types";

const VALID_DELIVERY_OPTIONS: DeliveryOption[] = ["express", "standard", "collection"];

function parseDelivery(raw: string | undefined): DeliveryOption[] | undefined {
  if (!raw) return undefined;
  const options = raw.split(",").map((d) => d.trim()).filter(
    (d): d is DeliveryOption => VALID_DELIVERY_OPTIONS.includes(d as DeliveryOption),
  );
  return options.length > 0 ? options : undefined;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const raw = {
    category:    sp.get("category")    ?? undefined,
    subcategory: sp.get("subcategory") ?? undefined,
    brand:       sp.get("brand")       ?? undefined,
    q:           sp.get("q")           ?? undefined,
    minPrice:    sp.get("minPrice")    ?? undefined,
    maxPrice:    sp.get("maxPrice")    ?? undefined,
    inStock:     sp.get("inStock")     ?? undefined,
    rating:      sp.get("rating")      ?? undefined,
    discount:    sp.get("discount")    ?? undefined,
    delivery:    sp.get("delivery")    ?? undefined,
    sortBy:      sp.get("sortBy")      ?? undefined,
    page:        sp.get("page")        ?? undefined,
    limit:       sp.get("limit")       ?? undefined,
    slugs:       sp.get("slugs")       ?? undefined,
  };

  const parsed = ProductFiltersSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: "Invalid filter parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const filters: ProductFilters = {
    category:        data.category,
    subcategory:     data.subcategory,
    brands:          data.brand ? data.brand.split(",").map((b) => b.trim()).filter(Boolean) : undefined,
    search:          data.q,
    sortBy:          data.sortBy,
    inStock:         data.inStock === "true" ? true : undefined,
    minPrice:        data.minPrice,
    maxPrice:        data.maxPrice,
    rating:          data.rating,
    discount:        data.discount,
    deliveryOptions: parseDelivery(data.delivery),
    page:            data.page,
    limit:           data.limit,
    slugs:           data.slugs ? data.slugs.split(",") : undefined,
  };

  try {
    const result = await getProducts(filters);
    return Response.json({ success: true, data: result });
  } catch {
    return Response.json({ success: false, error: "Failed to fetch products" }, { status: 500 });
  }
}
