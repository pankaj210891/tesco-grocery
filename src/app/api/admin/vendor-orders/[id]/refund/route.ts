import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Razorpay from "razorpay";
import { z } from "zod";
import { connectDB } from "@/lib/db/mongoose";
import { requireAdmin } from "@/lib/utils/apiAuth";
import VendorOrderModel from "@/lib/db/models/vendor-order.model";
import OrderModel from "@/lib/db/models/order.model";
import { markVendorOrderRefunded } from "@/services/vendor-order.service";
import { syncParentOrderStatus } from "@/services/order-status.service";
import { sendRefundConfirmed } from "@/services/email.service";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  reason:  z.string().min(5).max(300),
  // If not provided, full vendor sub-order amount is refunded
  amount:  z.number().positive().optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ success: false, error: "Invalid vendor order ID" }, { status: 400 });
  }

  const body   = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0].message },
      { status: 422 },
    );
  }

  try {
    await connectDB();

    const vendorOrder = await VendorOrderModel
      .findById(id)
      .lean<{
        parentOrderId: mongoose.Types.ObjectId;
        vendorEarning: number;
        subtotal:      number;
        refundStatus:  string;
        refundedAmount:number;
        items: Array<{ name: string; productId: string; quantity: number }>;
      }>();

    if (!vendorOrder) {
      return NextResponse.json({ success: false, error: "Vendor order not found" }, { status: 404 });
    }

    if (vendorOrder.refundStatus === "full") {
      return NextResponse.json(
        { success: false, error: "This vendor order has already been fully refunded" },
        { status: 422 },
      );
    }

    const parentOrder = await OrderModel
      .findById(vendorOrder.parentOrderId)
      .lean<{
        razorpayPaymentId?: string;
        paymentMethod: string;
        paymentStatus: string;
        total: number;
        refundedAmount?: number;
        delivery: { email: string; fullName: string };
        orderNumber: string;
      }>();

    if (!parentOrder) {
      return NextResponse.json({ success: false, error: "Parent order not found" }, { status: 404 });
    }

    if (parentOrder.paymentMethod !== "razorpay" || parentOrder.paymentStatus === "pending") {
      return NextResponse.json(
        { success: false, error: "Only paid Razorpay orders can be refunded" },
        { status: 422 },
      );
    }

    const alreadyRefunded = vendorOrder.refundedAmount ?? 0;
    const maxRefundable   = vendorOrder.subtotal - alreadyRefunded;
    const refundAmount    = parsed.data.amount ?? maxRefundable;
    const isFull          = refundAmount >= maxRefundable;

    if (refundAmount <= 0 || refundAmount > maxRefundable) {
      return NextResponse.json(
        { success: false, error: `Invalid refund amount. Maximum refundable: ₹${maxRefundable.toFixed(2)}` },
        { status: 422 },
      );
    }

    // Initiate Razorpay partial refund
    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { success: false, error: "Razorpay credentials not configured" },
        { status: 500 },
      );
    }

    if (!parentOrder.razorpayPaymentId) {
      return NextResponse.json(
        { success: false, error: "No Razorpay payment ID found on parent order" },
        { status: 422 },
      );
    }

    const razorpay   = new Razorpay({ key_id: keyId, key_secret: keySecret });
    const amountPaise = Math.round(refundAmount * 100);

    const refund = await razorpay.payments.refund(parentOrder.razorpayPaymentId, {
      amount: amountPaise,
      notes:  { reason: parsed.data.reason, vendorOrderId: id },
    });

    // Update vendor order refund status
    await markVendorOrderRefunded(id, refundAmount, isFull);

    // Update parent order refund tracking
    const newParentRefunded = (parentOrder.refundedAmount ?? 0) + refundAmount;
    const isParentFullyRefunded = newParentRefunded >= parentOrder.total;

    await OrderModel.findByIdAndUpdate(vendorOrder.parentOrderId, {
      $set: {
        refundId:          refund.id,
        refundStatus:      "initiated",
        refundedAmount:    newParentRefunded,
        refundType:        isParentFullyRefunded ? "full" : "partial",
        refundReason:      parsed.data.reason,
        refundProcessedAt: new Date(),
        paymentStatus:     isParentFullyRefunded ? "refunded" : "partially_refunded",
      },
    });

    await syncParentOrderStatus(String(vendorOrder.parentOrderId));

    // Notify customer
    try {
      await sendRefundConfirmed(parentOrder.delivery.email, {
        orderNumber:  parentOrder.orderNumber,
        customerName: parentOrder.delivery.fullName,
        total:        refundAmount,
      });
    } catch {
      // Email failure is non-critical
    }

    return NextResponse.json({
      success: true,
      data: {
        refundId:      refund.id,
        refundAmount,
        isFull,
        vendorOrderId: id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to process refund";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
