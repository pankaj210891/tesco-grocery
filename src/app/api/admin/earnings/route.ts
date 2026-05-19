import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { getAllEarnings } from "@/services/vendor-earning.service";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit    = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const status   = searchParams.get("status")   ?? undefined;
  const vendorId = searchParams.get("vendorId") ?? undefined;

  const result = await getAllEarnings({ vendorId, status, page, limit });
  return NextResponse.json({ success: true, data: result });
}
