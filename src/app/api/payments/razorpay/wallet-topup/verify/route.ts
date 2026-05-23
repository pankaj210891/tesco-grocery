import crypto from "crypto";
import { z } from "zod";
import { getAuthUser } from "@/lib/utils/apiAuth";
import { topupWallet } from "@/services/wallet.service";

const bodySchema = z.object({
  razorpayOrderId:   z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  amount:            z.number().int().min(10).max(50000),
  userId:            z.string().min(1),
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

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, amount, userId } = parsed.data;

    if (auth.userId !== userId) {
      return Response.json({ success: false, error: "Forbidden." }, { status: 403 });
    }

    // ── Verify HMAC signature ─────────────────────────────────────────────────
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return Response.json({ success: false, error: "Payment configuration error." }, { status: 500 });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return Response.json(
        { success: false, error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // ── Credit wallet after verified payment ──────────────────────────────────
    const { wallet } = await topupWallet(
      userId,
      amount,
      `Razorpay top-up — ${razorpayPaymentId}`
    );

    return Response.json({
      success: true,
      data: { wallet: { balance: wallet.balance } },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wallet top-up failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
