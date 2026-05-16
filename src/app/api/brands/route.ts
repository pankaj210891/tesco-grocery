import { getBrands } from "@/services/product.service";

// Returns all distinct, non-empty product brands sorted alphabetically.
// Cached for 60 s at the CDN/edge layer — brands change infrequently.
export const revalidate = 60;

export async function GET() {
  try {
    const brands = await getBrands();
    return Response.json({ success: true, data: brands });
  } catch {
    return Response.json(
      { success: false, error: "Failed to fetch brands" },
      { status: 500 },
    );
  }
}
