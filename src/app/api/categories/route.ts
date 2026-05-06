import { getCategories } from "@/services/product.service";

export async function GET() {
  try {
    const data = await getCategories();
    return Response.json({ success: true, data });
  } catch {
    return Response.json({ success: false, error: "Failed to fetch categories" }, { status: 500 });
  }
}
