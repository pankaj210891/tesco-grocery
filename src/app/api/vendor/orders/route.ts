import { NextRequest, NextResponse } from "next/server";
import { requireVendor } from "@/lib/utils/apiAuth";
import { getVendorOrders } from "@/services/vendor-order.service";
import { VENDOR_ORDER_STATUSES, type VendorOrderStatus } from "@/lib/db/models/vendor-order.model";

export async function GET(req: NextRequest) {
  const auth = await requireVendor(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(req.url);
    const page      = Math.max(1, Number(searchParams.get("page")  ?? 1));
    const limit     = Math.min(50, Number(searchParams.get("limit") ?? 20));
    const status    = searchParams.get("status") ?? "";
    const cursor    = searchParams.get("cursor") ?? undefined;

    const validStatus = VENDOR_ORDER_STATUSES.includes(status as VendorOrderStatus)
      ? (status as VendorOrderStatus)
      : undefined;

    const result = await getVendorOrders({
      vendorId: auth.vendorId,
      status:   validStatus,
      page,
      limit,
      cursor,
    });

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch orders" }, { status: 500 });
  }
}
