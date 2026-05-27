import { z } from "zod";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { getRazorpay } from "@/lib/razorpay";

const bodySchema = z.object({
  amount: z.number().int().min(10).max(50000),
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const auth = getAuthUser(req);
    if (!auth) {
      return Response.json({ success: false, error: "Unauthorised." }, { status: 401 });
    }

    const body   = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const { amount, userId } = parsed.data;

    if (auth.userId !== userId) {
      return Response.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    const rzp = getRazorpay();
    const order = await (rzp.orders.create({
      amount:          amount * 100, // subunits (100 per major unit)
      currency:        process.env.NEXT_PUBLIC_CURRENCY ?? "INR",
      payment_capture: true,
      receipt:         `wt_${Date.now()}`, // max 40 chars — keep short
      notes:           { userId, purpose: "wallet_topup" },
    }) as unknown as Promise<{ id: string; amount: number; currency: string }>);

    return Response.json({
      success: true,
      data: {
        razorpayOrderId: order.id,
        amount:          order.amount,
        currency:        order.currency,
        keyId:           process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      },
    });
  } catch (err) {
    console.error("[wallet-topup/create-order]", err);
    const message = err instanceof Error ? err.message : "Failed to create topup order.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
