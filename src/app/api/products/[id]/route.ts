import { getProductBySlug } from "@/services/product.service";

// [id] accepts a product slug — e.g. GET /api/products/organic-whole-milk
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const product = await getProductBySlug(id);
    if (!product) {
      return Response.json({ success: false, error: "Product not found" }, { status: 404 });
    }
    return Response.json({ success: true, data: product });
  } catch {
    return Response.json({ success: false, error: "Failed to fetch product" }, { status: 500 });
  }
}
