import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import { connectDB } from "@/lib/db/mongoose";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import VendorEarningModel from "@/lib/db/models/vendor-earning.model";

/**
 * POST /api/admin/earnings/backfill
 *
 * One-time repair: finds every vendor sub-order with status DELIVERED whose
 * corresponding VendorEarning is still "pending", and confirms them.
 * Safe to call multiple times — only touches rows that still need fixing.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  try {
    await connectDB();

    // All delivered vendor sub-orders
    const deliveredOrders = await VendorOrderModel
      .find({ status: "DELIVERED" })
      .select("parentOrderId vendorId")
      .lean<Array<{
        parentOrderId: mongoose.Types.ObjectId;
        vendorId:      mongoose.Types.ObjectId;
      }>>();

    if (deliveredOrders.length === 0) {
      return NextResponse.json({ success: true, confirmed: 0, message: "No delivered orders found." });
    }

    // Collect unique parentOrderIds of all delivered sub-orders
    const parentOrderIds = [...new Set(
      deliveredOrders.map((o) => o.parentOrderId.toString()),
    )].map((id) => new mongoose.Types.ObjectId(id));

    // Confirm all pending earnings whose orderId belongs to a delivered parent order.
    // This is safe: an earning is only confirmed here if the corresponding sub-order is DELIVERED.
    const result = await VendorEarningModel.updateMany(
      {
        orderId: { $in: parentOrderIds },
        status:  "pending" as const,
      },
      { $set: { status: "confirmed" as const } },
    );

    return NextResponse.json({
      success:   true,
      confirmed: result.modifiedCount,
      message:   `${result.modifiedCount} earning(s) confirmed from ${deliveredOrders.length} delivered sub-order(s).`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backfill failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
