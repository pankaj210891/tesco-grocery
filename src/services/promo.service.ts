/**
 * Promo-code business logic.
 *
 * ALL discount calculations happen here — never on the frontend.
 * API routes call these functions and return the result; the client
 * only stores / displays what the server returns.
 */

import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";
import Offer, { type IOffer } from "@/lib/db/models/offer.model";
import PromoUsageModel from "@/lib/db/models/promo-usage.model";
import OrderModel from "@/lib/db/models/order.model";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_COST } from "@/lib/constants/promos";

// ─── Shared types (re-exported for API routes and the store) ──────────────────

export interface CartItemInput {
  productId: string;
  category: string; // category slug, e.g. "fresh-food"
  price: number;
  quantity: number;
}

export interface PromoApplyInput {
  code: string;
  userId?: string;
  items: CartItemInput[];
  subtotal: number;
  postcode?: string; // delivery postcode — only required at checkout
}

export interface PromoApplyResult {
  valid: boolean;
  code?: string;
  label?: string;
  discountType?: "percentage" | "fixed" | "freeDelivery";
  discountValue?: number;
  discountAmount: number; // server-calculated absolute saving in ₹
  minOrderValue?: number;
  error?: string;
}

export interface EligiblePromo {
  _id: string;
  code: string;
  title: string;
  description?: string;
  discountType: "percentage" | "fixed" | "freeDelivery";
  discountValue: number;
  discountAmount: number; // projected saving for this cart
  minOrderValue: number;
  badge?: string;
  emoji?: string;
  color?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

type LeanOffer = IOffer & { _id: mongoose.Types.ObjectId };

function deliveryFeeFor(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_COST;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Returns the subtotal of cart items that are eligible for the promo.
 * If the offer has no category/product restrictions, returns the full subtotal.
 */
function eligibleSubtotal(offer: LeanOffer, items: CartItemInput[]): number {
  const hasCategories = offer.eligibleCategories.length > 0;
  const hasProducts = offer.eligibleProductIds.length > 0;

  if (!hasCategories && !hasProducts) {
    return items.reduce((s, i) => s + i.price * i.quantity, 0);
  }

  return items
    .filter((i) => {
      const okCategory =
        !hasCategories || offer.eligibleCategories.includes(i.category);
      const okProduct =
        !hasProducts || offer.eligibleProductIds.includes(i.productId);
      return okCategory && okProduct;
    })
    .reduce((s, i) => s + i.price * i.quantity, 0);
}

/**
 * Calculates the absolute discount amount in ₹.
 * For freeDelivery: returns the delivery fee that would have been charged.
 * For percentage/fixed on restricted items: applies to eligible subtotal only.
 */
function computeDiscount(
  offer: LeanOffer,
  eligSub: number,
  cartSubtotal: number,
): number {
  const fee = deliveryFeeFor(cartSubtotal);

  switch (offer.discountType) {
    case "percentage":
      return round2(eligSub * (offer.discountValue / 100));
    case "fixed":
      return round2(Math.min(offer.discountValue, eligSub));
    case "freeDelivery":
      return round2(fee); // 0 if already free
    default:
      return 0;
  }
}

// ─── Usage-limit helpers (parallelised) ───────────────────────────────────────

async function totalUsageCount(code: string): Promise<number> {
  return PromoUsageModel.countDocuments({ promoCode: code });
}

async function userUsageCount(code: string, userId: string): Promise<number> {
  return PromoUsageModel.countDocuments({ promoCode: code, userId });
}

async function hasAnyOrder(userId: string): Promise<boolean> {
  return !!(await OrderModel.findOne({ userId }).select("_id").lean());
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full server-side promo validation.
 * Checks existence, active status, expiry, minimum order, usage limits,
 * first-order restrictions, pincode restrictions, and item eligibility.
 * Returns the backend-calculated discountAmount on success.
 */
export async function applyPromo(
  input: PromoApplyInput,
): Promise<PromoApplyResult> {
  await connectDB();
  const { items, subtotal, userId, postcode } = input;
  const code = input.code.trim().toUpperCase();

  // ── 1. Existence ─────────────────────────────────────────────────────────────
  const offer = (await Offer.findOne({ code }).lean()) as LeanOffer | null;
  if (!offer) {
    return { valid: false, discountAmount: 0, error: "Invalid promo code" };
  }

  // ── 2. Active & not expired ───────────────────────────────────────────────────
  if (!offer.isActive) {
    return {
      valid: false,
      discountAmount: 0,
      error: "This promo code is no longer active",
    };
  }
  if (new Date(offer.expiresAt) < new Date()) {
    return {
      valid: false,
      discountAmount: 0,
      error: "This promo code has expired",
    };
  }

  // ── 3. Minimum order ──────────────────────────────────────────────────────────
  if (subtotal < offer.minOrderValue) {
    return {
      valid: false,
      discountAmount: 0,
      error: `Minimum order of ₹${Math.round(offer.minOrderValue)} required for this code`,
    };
  }

  // ── 4. Usage limits (run queries in parallel) ─────────────────────────────────
  const [totalCount, userCount, firstOrderCheck] = await Promise.all([
    offer.usageLimit != null ? totalUsageCount(code) : Promise.resolve(0),
    offer.perUserLimit != null && userId
      ? userUsageCount(code, userId)
      : Promise.resolve(0),
    offer.firstOrderOnly && userId
      ? hasAnyOrder(userId)
      : Promise.resolve(false),
  ]);

  if (offer.usageLimit != null && totalCount >= offer.usageLimit) {
    return {
      valid: false,
      discountAmount: 0,
      error: "This promo code has reached its usage limit",
    };
  }
  if (offer.perUserLimit != null && userId && userCount >= offer.perUserLimit) {
    return {
      valid: false,
      discountAmount: 0,
      error:
        "You have already used this promo code the maximum number of times",
    };
  }
  if (offer.firstOrderOnly && firstOrderCheck) {
    return {
      valid: false,
      discountAmount: 0,
      error: "This promo code is for first orders only",
    };
  }

  // ── 5. Pincode restriction (only checked when postcode is provided) ───────────
  if (offer.eligiblePincodes.length > 0 && postcode) {
    const upper = postcode.trim().toUpperCase();
    const ok = offer.eligiblePincodes.some((p) =>
      upper.startsWith(p.trim().toUpperCase()),
    );
    if (!ok) {
      return {
        valid: false,
        discountAmount: 0,
        error: "This promo code is not available for your delivery area",
      };
    }
  }

  // ── 6. Category / product eligibility ────────────────────────────────────────
  const eligSub = eligibleSubtotal(offer, items);
  const hasRestrictions =
    offer.eligibleCategories.length > 0 || offer.eligibleProductIds.length > 0;

  if (hasRestrictions && eligSub === 0) {
    const restriction =
      offer.eligibleCategories.length > 0
        ? offer.eligibleCategories.map((c) => c.replace(/-/g, " ")).join(", ")
        : "selected products";
    return {
      valid: false,
      discountAmount: 0,
      error: `This code is only valid for ${restriction}. Add eligible items to your cart.`,
    };
  }

  // ── 7. Calculate discount ─────────────────────────────────────────────────────
  const discountAmount = computeDiscount(offer, eligSub, subtotal);

  return {
    valid: true,
    code: offer.code,
    label: offer.title,
    discountType: offer.discountType,
    discountValue: offer.discountValue,
    discountAmount,
    minOrderValue: offer.minOrderValue,
  };
}

/**
 * Fetches all promos the current cart is genuinely eligible for.
 * Postcode is intentionally not checked here (user may not have entered address yet).
 * Sorted by projected savings (highest first).
 */
export async function getEligiblePromos(
  input: Omit<PromoApplyInput, "code" | "postcode">,
): Promise<EligiblePromo[]> {
  await connectDB();
  const { items, subtotal, userId } = input;

  const offers = (await Offer.find({
    isActive: true,
    expiresAt: { $gt: new Date() },
    code: { $exists: true, $nin: [null, ""] },
  })
    .sort({ order: 1 })
    .lean()) as LeanOffer[];

  const fee = deliveryFeeFor(subtotal);

  // Fetch first-order status once if any offer requires it
  const needsFirstOrderCheck = userId && offers.some((o) => o.firstOrderOnly);
  const isReturningCustomer = needsFirstOrderCheck
    ? await hasAnyOrder(userId)
    : false;

  // Fetch per-user usage for all offers that have perUserLimit, in parallel
  const codeList = offers
    .filter((o) => o.perUserLimit != null)
    .map((o) => o.code!);
  const userCounts: Record<string, number> = {};
  if (userId && codeList.length > 0) {
    const counts = await Promise.all(
      codeList.map((c) => userUsageCount(c, userId)),
    );
    codeList.forEach((c, i) => {
      userCounts[c] = counts[i];
    });
  }

  // Fetch total usage for offers with usageLimit
  const limitedCodes = offers
    .filter((o) => o.usageLimit != null)
    .map((o) => o.code!);
  const totalCounts: Record<string, number> = {};
  if (limitedCodes.length > 0) {
    const counts = await Promise.all(
      limitedCodes.map((c) => totalUsageCount(c)),
    );
    limitedCodes.forEach((c, i) => {
      totalCounts[c] = counts[i];
    });
  }

  const eligible: EligiblePromo[] = [];

  for (const offer of offers) {
    const code = offer.code!;

    // Minimum order
    if (subtotal < offer.minOrderValue) continue;

    // Usage limits
    if (
      offer.usageLimit != null &&
      (totalCounts[code] ?? 0) >= offer.usageLimit
    )
      continue;
    if (
      offer.perUserLimit != null &&
      userId &&
      (userCounts[code] ?? 0) >= offer.perUserLimit
    )
      continue;

    // First-order-only
    if (offer.firstOrderOnly && isReturningCustomer) continue;

    // Free delivery when already qualifying — genuinely useless promo
    if (offer.discountType === "freeDelivery" && fee === 0) continue;

    // Category / product eligibility
    const hasRestrictions =
      offer.eligibleCategories?.length > 0 ||
      offer.eligibleProductIds?.length > 0;
    const eligSub = eligibleSubtotal(offer, items);
    if (hasRestrictions && eligSub === 0) continue;

    const discountAmount = computeDiscount(offer, eligSub, subtotal);
    if (discountAmount <= 0) continue;

    eligible.push({
      _id: offer._id.toString(),
      code,
      title: offer.title,
      description: offer.description,
      discountType: offer.discountType,
      discountValue: offer.discountValue,
      discountAmount,
      minOrderValue: offer.minOrderValue,
      badge: offer.badge,
      emoji: offer.emoji,
      color: offer.color,
    });
  }

  // Best savings first
  eligible.sort((a, b) => b.discountAmount - a.discountAmount);
  return eligible;
}

/**
 * Records a promo usage after a successful order.
 * Increments the global usedCount on the Offer document.
 * Called by the orders API — never by the client directly.
 */
export async function recordPromoUsage(
  promoId: string,
  code: string,
  userId: string,
  orderId: string,
  discountAmount: number,
): Promise<void> {
  await connectDB();
  await Promise.all([
    PromoUsageModel.create({
      promoId,
      promoCode: code.toUpperCase(),
      userId,
      orderId,
      discountAmount,
    }),
    Offer.findByIdAndUpdate(promoId, { $inc: { usedCount: 1 } }),
  ]);
}
