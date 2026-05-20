import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/utils/apiAuth";
import { getVendorEarnings, getVendorEarningsSummary } from "@/services/vendor-earning.service";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const page   = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit  = Math.min(50, Number(searchParams.get("limit") ?? 20));
  const status = searchParams.get("status") ?? "";

  const [result, summary] = await Promise.all([
    getVendorEarnings(auth.vendorId, page, limit, status || undefined),
    getVendorEarningsSummary(auth.vendorId),
  ]);

  return NextResponse.json({ success: true, data: { ...result, summary } });
}
