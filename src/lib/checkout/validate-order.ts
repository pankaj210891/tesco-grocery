import { connectDB } from "@/lib/db/mongoose";
import { applyPromo, recordPromoUsage } from "@/services/promo.service";
import Offer from "@/lib/db/models/offer.model";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_COST } from "@/lib/constants/promos";
import type { OrderItem } from "@/services/order.service";

export interface CheckoutItem extends OrderItem {
  category?: string;
}

export interface ValidatedOrder {
  items:           OrderItem[];
  delivery: {
    fullName: string;
    email:    string;
    phone:    string;
    address:  string;
    city:     string;
    postcode: string;
  };
  subtotal:        number;
  deliveryFee:     number;
  discount:        number;
  promoCode?:      string;
  promoDocId?:     string;
  total:           number;
}

export async function validateCheckoutOrder(params: {
  items:      CheckoutItem[];
  delivery:   ValidatedOrder["delivery"];
  promoCode?: string;
  userId?:    string;
}): Promise<ValidatedOrder> {
  const { items, delivery, promoCode: rawPromo, userId } = params;

  const subtotal    = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const rawDelivery = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;

  let discount          = 0;
  let validatedCode: string | undefined;
  let promoDocId: string | undefined;
  let effectiveDelivery = rawDelivery;

  const promoCodeNorm = rawPromo?.trim().toUpperCase();
  if (promoCodeNorm) {
    const promoItems = items.map((i) => ({
      productId: i.productId,
      category:  i.category ?? "",
      price:     i.price,
      quantity:  i.quantity,
    }));

    const result = await applyPromo({
      code:     promoCodeNorm,
      userId,
      items:    promoItems,
      subtotal,
      postcode: delivery.postcode,
    });

    if (result.valid) {
      validatedCode = result.code;
      discount      = result.discountAmount;

      if (result.discountType === "freeDelivery") {
        effectiveDelivery = 0;
        discount          = rawDelivery;
      }

      await connectDB();
      const offerDoc = await Offer.findOne({ code: validatedCode }).select("_id").lean() as { _id: { toString(): string } } | null;
      if (offerDoc) promoDocId = offerDoc._id.toString();
    }
  }

  const total = Math.max(0, subtotal + effectiveDelivery - discount);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const cleanItems = items.map(({ category: _cat, ...rest }) => rest);

  return {
    items:       cleanItems,
    delivery,
    subtotal,
    deliveryFee: effectiveDelivery,
    discount,
    promoCode:   validatedCode,
    promoDocId,
    total,
  };
}

export async function firePromoUsage(
  validatedCode: string | undefined,
  promoDocId:    string | undefined,
  userId:        string | undefined,
  orderId:       string,
  discount:      number,
): Promise<void> {
  if (validatedCode && promoDocId && userId) {
    void recordPromoUsage(promoDocId, validatedCode, userId, orderId, discount);
  }
}
