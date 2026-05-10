import { NextResponse } from "next/server";

function days(n: number) {
  return new Date(Date.now() + n * 86_400_000);
}

const OFFERS = [
  {
    title: "Weekend Mega Sale",
    subtitle: "Up to 30% off fresh food",
    description: "Massive savings across our fresh food range every weekend. Stock up on fruits, vegetables, meats, and dairy at unbeatable prices.",
    code: "WEEKEND30",
    discountType: "percentage",
    discountValue: 30,
    minOrderValue: 0,
    expiresAt: days(3),
    badge: "HOT",
    color: "#FFF3E0",
    emoji: "🥦",
    category: "fresh-food",
    href: "/categories/fresh-food",
    order: 1,
  },
  {
    title: "Free Delivery on Orders Over £50",
    subtitle: "Shop more, save on delivery",
    description: "Enjoy free next-day delivery on all orders over £50. No promo code needed — the discount is applied automatically at checkout.",
    discountType: "freeDelivery",
    discountValue: 0,
    minOrderValue: 50,
    expiresAt: days(30),
    badge: "FREE",
    color: "#E8F5E9",
    emoji: "🚚",
    category: "all",
    href: "/products",
    order: 2,
  },
  {
    title: "Bakery Fresh Every Morning",
    subtitle: "20% off all bakery items before 10am",
    description: "Freshly baked bread, pastries, and cakes discounted every morning before 10am in-store. Use code at checkout for online orders.",
    code: "FRESHBAKE20",
    discountType: "percentage",
    discountValue: 20,
    minOrderValue: 0,
    expiresAt: days(14),
    badge: "NEW",
    color: "#FFF8E1",
    emoji: "🥐",
    category: "bakery",
    href: "/categories/bakery",
    order: 3,
  },
  {
    title: "£10 Off Your First Order",
    subtitle: "New customer exclusive",
    description: "Welcome to Prakash Supermarket! Enjoy £10 off your first online order when you spend £30 or more. One use per customer.",
    code: "WELCOME10",
    discountType: "fixed",
    discountValue: 10,
    minOrderValue: 30,
    expiresAt: days(60),
    badge: "NEW",
    color: "#E3F2FD",
    emoji: "🎉",
    category: "all",
    href: "/products",
    order: 4,
  },
  {
    title: "Drinks Bonanza",
    subtitle: "Buy 2 get 1 free on selected drinks",
    description: "Stock up your fridge with our buy-2-get-1-free promotion across a wide range of soft drinks, juices, and sparkling water.",
    code: "DRINKS3FOR2",
    discountType: "percentage",
    discountValue: 33,
    minOrderValue: 0,
    expiresAt: days(7),
    badge: "3 FOR 2",
    color: "#E1F5FE",
    emoji: "🥤",
    category: "drinks",
    href: "/categories/drinks",
    order: 5,
  },
  {
    title: "Frozen Food Fiesta",
    subtitle: "Save 25% across frozen range",
    description: "Convenience meets savings. 25% off our entire frozen range including ready meals, ice cream, frozen vegetables, and more.",
    code: "FROZEN25",
    discountType: "percentage",
    discountValue: 25,
    minOrderValue: 20,
    expiresAt: days(10),
    badge: "SALE",
    color: "#E0F7FA",
    emoji: "❄️",
    category: "frozen-food",
    href: "/categories/frozen-food",
    order: 6,
  },
  {
    title: "Health & Beauty Event",
    subtitle: "15% off premium brands",
    description: "Treat yourself with 15% off across our Health & Beauty range. Includes skincare, haircare, vitamins, and personal care products.",
    code: "BEAUTY15",
    discountType: "percentage",
    discountValue: 15,
    minOrderValue: 15,
    expiresAt: days(21),
    badge: "EVENT",
    color: "#FCE4EC",
    emoji: "💄",
    category: "health-beauty",
    href: "/categories/health-beauty",
    order: 7,
  },
  {
    title: "PRAKASH10 — Always On",
    subtitle: "10% off any order",
    description: "Our signature promo code gives you 10% off any order, any time. Share with family and friends — this one never expires.",
    code: "PRAKASH10",
    discountType: "percentage",
    discountValue: 10,
    minOrderValue: 0,
    expiresAt: days(365),
    badge: "ALWAYS ON",
    color: "#EDE7F6",
    emoji: "🏷️",
    category: "all",
    href: "/products",
    order: 8,
  },
];

export async function POST() {
  try {
    const { connectDB } = await import("@/lib/db/mongoose");
    await connectDB();
    const OfferModel = (await import("@/lib/db/models/offer.model")).default;

    await OfferModel.deleteMany({});
    await OfferModel.insertMany(OFFERS);

    return NextResponse.json({ success: true, message: `Seeded ${OFFERS.length} offers` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Seed failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
