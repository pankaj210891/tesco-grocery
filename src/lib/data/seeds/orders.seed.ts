/**
 * Order seed generator.
 *
 * Call generateOrders(products, userIds) after products & users are inserted.
 * Returns 30 Order documents ready for insertMany.
 *
 * Each order:
 *  - belongs to a seeded customer (U02–U10)
 *  - contains 1–5 realistic product line items
 *  - has a believable delivery address
 *  - may include a promo code discount
 *  - has one of the five order statuses
 */

import mongoose from "mongoose";
import { USER_IDS } from "./ids";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderProductRef {
  _id: mongoose.Types.ObjectId | string;
  name: string;
  slug: string;
  price: number;
  images: string[];
}

export interface OrderLineItem {
  productId: string;
  name:      string;
  slug:      string;
  price:     number;
  quantity:  number;
  image:     string;
}

export interface DeliveryAddress {
  fullName: string;
  email:    string;
  phone:    string;
  address:  string;
  city:     string;
  postcode: string;
}

export interface OrderSeed {
  orderNumber: string;
  userId:      string;
  items:       OrderLineItem[];
  delivery:    DeliveryAddress;
  subtotal:    number;
  deliveryFee: number;
  discount:    number;
  promoCode?:  string;
  total:       number;
  status:      "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt:   Date;
}

// ─── Static data ─────────────────────────────────────────────────────────────

const STATUSES: OrderSeed["status"][] = [
  "delivered","delivered","delivered","delivered",
  "shipped","shipped","shipped",
  "processing","processing",
  "pending",
  "cancelled",
];

const PROMO_CODES: { code: string; pct: number }[] = [
  { code: "WEEKEND30",  pct: 0.30 },
  { code: "FRESHBAKE20",pct: 0.20 },
  { code: "WELCOME10",  pct: 0.10 },
  { code: "DRINKS3FOR2",pct: 0.33 },
  { code: "PRAKASH10",  pct: 0.10 },
];

const ADDRESSES: DeliveryAddress[] = [
  { fullName: "Priya Sharma",     email: "priya.sharma@example.com",    phone: "07711000001", address: "14 Elm Close",           city: "Wembley",       postcode: "HA9 7AB" },
  { fullName: "Rahul Mehta",      email: "rahul.mehta@example.com",     phone: "07711000002", address: "28 Oak Avenue",          city: "Harrow",        postcode: "HA1 2SQ" },
  { fullName: "Ananya Singh",     email: "ananya.singh@example.com",    phone: "07711000003", address: "3 Maple Road",           city: "Southall",      postcode: "UB1 1LW" },
  { fullName: "Vikram Patel",     email: "vikram.patel@example.com",    phone: "07711000004", address: "55 Cedar Street",        city: "Ealing",        postcode: "W5 2XA"  },
  { fullName: "Deepa Nair",       email: "deepa.nair@example.com",      phone: "07711000005", address: "9 Birch Lane",           city: "Hayes",         postcode: "UB3 3EE" },
  { fullName: "Arjun Kapoor",     email: "arjun.kapoor@example.com",    phone: "07711000006", address: "67 Willow Drive",        city: "Greenford",     postcode: "UB6 0HG" },
  { fullName: "Meera Joshi",      email: "meera.joshi@example.com",     phone: "07711000007", address: "12 Pine Crescent",       city: "Northolt",      postcode: "UB5 4PH" },
  { fullName: "Rohan Gupta",      email: "rohan.gupta@example.com",     phone: "07711000008", address: "88 Ash Gardens",         city: "Hounslow",      postcode: "TW3 2QA" },
  { fullName: "Sunita Rao",       email: "sunita.rao@example.com",      phone: "07711000009", address: "22 Chestnut Row",        city: "Uxbridge",      postcode: "UB8 1JQ" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgoDate(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function genOrderNumber(index: number): string {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const uid = (index + 1001).toString(36).toUpperCase().padStart(6, "0");
  return `PS-${day}-${uid}`;
}

const CUSTOMER_KEYS = ["U02","U03","U04","U05","U06","U07","U08","U09","U10"] as const;

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateOrders(products: OrderProductRef[]): OrderSeed[] {
  if (products.length === 0) return [];

  const orders: OrderSeed[] = [];

  for (let i = 0; i < 30; i++) {
    const userKey   = CUSTOMER_KEYS[i % CUSTOMER_KEYS.length];
    const userId    = USER_IDS[userKey];
    const address   = ADDRESSES[i % ADDRESSES.length];
    const status    = STATUSES[i % STATUSES.length];
    const itemCount = rand(1, 5);

    // pick distinct products
    const pool    = [...products].sort(() => Math.random() - 0.5).slice(0, itemCount);
    const items: OrderLineItem[] = pool.map((p) => ({
      productId: p._id.toString(),
      name:      p.name,
      slug:      p.slug,
      price:     p.price,
      quantity:  rand(1, 3),
      image:     p.images[0] ?? "",
    }));

    const subtotal = round2(
      items.reduce((s, it) => s + it.price * it.quantity, 0)
    );

    const deliveryFee = subtotal >= 40 ? 0 : 3.99;

    // ~40% chance of a promo code
    let discount  = 0;
    let promoCode: string | undefined;
    if (Math.random() < 0.40 && subtotal >= 10) {
      const promo = pick(PROMO_CODES);
      promoCode   = promo.code;
      discount    = round2(subtotal * promo.pct);
    }

    const total = round2(subtotal + deliveryFee - discount);

    orders.push({
      orderNumber: genOrderNumber(i),
      userId,
      items,
      delivery:    address,
      subtotal,
      deliveryFee,
      discount,
      ...(promoCode ? { promoCode } : {}),
      total,
      status,
      createdAt: daysAgoDate(rand(1, 120)),
    });
  }

  return orders;
}
