import type { NextRequest } from "next/server";
import { getFilterMeta } from "@/services/product.service";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? undefined;

  try {
    const meta = await getFilterMeta(category);
    return Response.json({ success: true, data: meta });
  } catch {
    return Response.json({ success: false, error: "Failed to fetch filter options" }, { status: 500 });
  }
}
