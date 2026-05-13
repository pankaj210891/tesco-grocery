import { z } from "zod";
import { getRazorpay } from "@/lib/razorpay";
import { validateCheckoutOrder } from "@/lib/checkout/validate-order";

const deliverySchema = z.object({
  fullName: z.string().min(2),
  email:    z.string().email(),
  phone:    z.string().length(10).regex(/^\d{10}$/),
  address:  z.string().min(5),
  city:     z.string().min(2),
  postcode: z.string().min(5).max(8),
});

const itemSchema = z.object({
  productId: z.string(),
  name:      z.string(),
  slug:      z.string(),
  price:     z.number().positive(),
  quantity:  z.number().int().positive(),
  image:     z.string(),
  category:  z.string().optional(),
});

const bodySchema = z.object({
  delivery:  deliverySchema,
  items:     z.array(itemSchema).min(1),
  promoCode: z.string().optional(),
  userId:    z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body   = await req.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 422 }
      );
    }

    const { delivery, items, promoCode, userId } = parsed.data;

    const validated = await validateCheckoutOrder({ items, delivery, promoCode, userId });

    // Razorpay requires amount in smallest currency unit (paise for INR)
    const amountInPaise = Math.round(validated.total * 100);

    const rzp   = getRazorpay();
    const order = await rzp.orders.create({
      amount:   amountInPaise,
      currency: "INR",
      receipt:  `rcpt_${Date.now()}`,
      notes: {
        userId:    userId ?? "",
        promoCode: validated.promoCode ?? "",
      },
    });

    return Response.json({
      success: true,
      data: {
        razorpayOrderId: order.id,
        amount:          order.amount,
        currency:        order.currency,
        keyId:           process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        // Return validated totals so UI can display them
        subtotal:    validated.subtotal,
        deliveryFee: validated.deliveryFee,
        discount:    validated.discount,
        promoCode:   validated.promoCode,
        total:       validated.total,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create payment order.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
