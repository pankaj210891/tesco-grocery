import { getCategoryTree } from "@/services/category.service";

// Always fetch fresh — tree changes when sub-categories are seeded
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getCategoryTree();
    return Response.json({ success: true, data });
  } catch {
    return Response.json(
      { success: false, error: "Failed to fetch category tree" },
      { status: 500 }
    );
  }
}
