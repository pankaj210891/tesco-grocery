import { getAllCategories } from "@/services/category.service";

export async function GET() {
  try {
    const data = await getAllCategories();
    return Response.json({ success: true, data });
  } catch {
    return Response.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
