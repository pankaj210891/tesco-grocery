/**
 * Review seed generator.
 *
 * Call generateReviews(products) after products are inserted.
 * Returns Review documents ready for insertMany — no DB queries inside.
 *
 * Rules:
 *  - Only products with reviewCount > 0 receive seed reviews.
 *  - Number of reviews per product = min(reviewCount, MAX_PER_PRODUCT).
 *  - One review per (userId × productId) pair is enforced by the schema index;
 *    we assign users round-robin to keep it collision-free.
 */

import mongoose from "mongoose";
import { USER_IDS, USER_NAMES, type UserKey } from "./ids";

const MAX_PER_PRODUCT = 12;

const CUSTOMER_KEYS: UserKey[] = [
  "U02","U03","U04","U05","U06","U07","U08","U09","U10",
];

// ─── Review text banks ────────────────────────────────────────────────────────

const FIVE_STAR: string[] = [
  "Absolutely love this! Great quality and arrived quickly. Will definitely buy again.",
  "Exceeded my expectations. Fresh, tasty and exactly as described. Top marks!",
  "Outstanding value for money. This is now a weekly staple in our household.",
  "The quality is genuinely impressive for the price. Highly recommend to everyone.",
  "Perfect — just what I needed. Flavour is excellent and packaging was secure.",
  "Best I've tried in this category. My whole family loves it. Five stars easily.",
  "Can't fault it. Fresher than I expected and great flavour. Will be ordering again.",
  "Brilliant product. Prompt delivery, excellent condition, exactly as pictured.",
];

const FOUR_STAR: string[] = [
  "Really good product overall. Minor packaging issue on arrival but the item itself is great.",
  "Solid quality and good value. I'd happily buy again. Just missing that extra wow factor.",
  "Very pleased with this purchase. Tastes great and the portion size is generous.",
  "Good product, does exactly what it says. Would recommend with no hesitation.",
  "Happy with this. It's a staple in our house — reliable and consistently good.",
  "Great quality, pretty much as described. Slight delay in delivery but worth the wait.",
  "Well made and good value. Would buy again. Packaging could be a little sturdier.",
  "Exactly what I was looking for. Fresh and well-presented. Will order again.",
];

const THREE_STAR: string[] = [
  "Decent enough but nothing special. Does the job but I've had better elsewhere.",
  "OK for the price but quality is a bit inconsistent. Sometimes great, sometimes average.",
  "It's fine. Not bad but not outstanding. Would consider alternatives at this price point.",
  "Middling quality. Works as advertised but I expected a bit more for the price paid.",
  "Average. Nothing wrong with it but nothing that makes it stand out from the competition.",
];

const TWO_STAR: string[] = [
  "Disappointed with this one. Quality wasn't up to the standard I expected. Won't reorder.",
  "Fell short of expectations. The description was a bit misleading. Hopefully an off batch.",
  "Not what I was hoping for. Texture and taste were both below par. Shame.",
];

const ONE_STAR: string[] = [
  "Really not impressed. Poor quality and not as described. Contacted customer service.",
  "Would not recommend. Item arrived damaged and wasn't up to the standard shown.",
];

const TITLES: Record<number, string[]> = {
  5: ["Absolutely brilliant!", "Love it!", "Top quality", "Highly recommended", "Perfect buy", "Excellent!", "Amazing value", "Won't look back"],
  4: ["Really good", "Solid product", "Very pleased", "Great value", "Would recommend", "Good quality", "Happy with this", "Solid choice"],
  3: ["Decent enough", "It's fine", "Average product", "OK for the price", "Nothing special", "Does the job"],
  2: ["Bit disappointed", "Expected more", "Not great", "Below par"],
  1: ["Poor quality", "Not recommended", "Very disappointed"],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function reviewBody(rating: number): string {
  if (rating === 5) return pick(FIVE_STAR);
  if (rating === 4) return pick(FOUR_STAR);
  if (rating === 3) return pick(THREE_STAR);
  if (rating === 2) return pick(TWO_STAR);
  return pick(ONE_STAR);
}

function reviewTitle(rating: number): string {
  return pick(TITLES[rating] ?? TITLES[3]);
}

function weightedRating(productRating: number): number {
  const r = productRating;
  const weights: [number, number][] =
    r >= 4.5
      ? [[5, 55], [4, 30], [3, 10], [2, 3], [1, 2]]
      : r >= 4.0
      ? [[5, 35], [4, 40], [3, 15], [2, 7], [1, 3]]
      : r >= 3.5
      ? [[5, 20], [4, 35], [3, 30], [2, 10], [1, 5]]
      : [[5, 10], [4, 20], [3, 35], [2, 25], [1, 10]];

  const total = weights.reduce((s, [, w]) => s + w, 0);
  let roll = Math.random() * total;
  for (const [stars, w] of weights) {
    roll -= w;
    if (roll <= 0) return stars;
  }
  return 4;
}

function daysAgoDate(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface ProductRef {
  _id: mongoose.Types.ObjectId | string;
  slug: string;
  rating: number;
  reviewCount: number;
}

export interface ReviewSeed {
  productId: mongoose.Types.ObjectId | string;
  productSlug: string;
  userId: mongoose.Types.ObjectId | string;
  userName: string;
  rating: number;
  title: string;
  body: string;
  isApproved: boolean;
  helpfulCount: number;
  createdAt: Date;
}

export function generateReviews(products: ProductRef[]): ReviewSeed[] {
  const reviews: ReviewSeed[] = [];
  let userIndex = 0;

  for (const product of products) {
    if (!product.reviewCount) continue;

    const count = Math.min(product.reviewCount, MAX_PER_PRODUCT);
    const usedUsers = new Set<string>();

    for (let i = 0; i < count; i++) {
      // cycle through customers, skip if already used for this product
      let key: UserKey | undefined;
      for (let attempt = 0; attempt < CUSTOMER_KEYS.length; attempt++) {
        const candidate = CUSTOMER_KEYS[(userIndex + attempt) % CUSTOMER_KEYS.length];
        if (!usedUsers.has(candidate)) {
          key = candidate;
          userIndex = (userIndex + attempt + 1) % CUSTOMER_KEYS.length;
          break;
        }
      }
      if (!key) break; // all customer slots used for this product

      usedUsers.add(key);

      const rating = weightedRating(product.rating);
      reviews.push({
        productId:    product._id,
        productSlug:  product.slug,
        userId:       USER_IDS[key],
        userName:     USER_NAMES[key],
        rating,
        title:        reviewTitle(rating),
        body:         reviewBody(rating),
        isApproved:   true,
        helpfulCount: Math.floor(Math.random() * 30),
        createdAt:    daysAgoDate(Math.floor(Math.random() * 180) + 1),
      });
    }
  }

  return reviews;
}
