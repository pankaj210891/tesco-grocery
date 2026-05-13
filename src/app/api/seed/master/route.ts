/**
 * POST /api/seed/master
 *
 * Master seed runner — runs all collections in dependency order:
 *   1. categories   (no deps)
 *   2. users        (no deps — passwords hashed here)
 *   3. vendors      (deps: users)
 *   4. products     (deps: vendors)
 *   5. reviews      (deps: products, users)
 *   6. orders       (deps: products, users)
 *   7. offers       (inline — no deps)
 *   8. stores       (inline — no deps)
 *   9. faqs         (inline — no deps)
 *  10. homepage     (inline — no deps)
 *
 * Supports partial re-seeding via body: { collections: ["products","reviews"] }
 * Development-only — returns 403 in production.
 *
 * Response: { results: SeedResult[], totalMs: number }
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db/mongoose";
import type { SeedResult } from "@/types";

// ─── Models ───────────────────────────────────────────────────────────────────
import CategoryModel     from "@/lib/db/models/category.model";
import UserModel         from "@/lib/db/models/user.model";
import VendorModel       from "@/lib/db/models/vendor.model";
import ProductModel      from "@/lib/db/models/product.model";
import ReviewModel       from "@/lib/db/models/review.model";
import OrderModel        from "@/lib/db/models/order.model";
import OfferModel        from "@/lib/db/models/offer.model";
import StoreModel        from "@/lib/db/models/store.model";
import FaqModel          from "@/lib/db/models/faq.model";
import HomepageSection   from "@/lib/db/models/homepage-section.model";

// ─── Seed data ────────────────────────────────────────────────────────────────
import { CATEGORY_SEEDS }          from "@/lib/data/seeds/categories.seed";
import { USER_SEEDS, SEED_PASSWORD } from "@/lib/data/seeds/users.seed";
import { VENDOR_SEEDS }            from "@/lib/data/seeds/vendors.seed";
import { PRODUCT_SEEDS }           from "@/lib/data/seeds/products.seed";
import { generateReviews }         from "@/lib/data/seeds/reviews.seed";
import { generateOrders }          from "@/lib/data/seeds/orders.seed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}

async function runSeeder(
  name: string,
  fn: () => Promise<{ inserted: number; deleted: number }>
): Promise<SeedResult> {
  const elapsed = timer();
  try {
    const { inserted, deleted } = await fn();
    return { collection: name, inserted, deleted, durationMs: elapsed() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { collection: name, inserted: 0, deleted: 0, durationMs: elapsed(), ...(({ error: msg } as unknown) as object) };
  }
}

// ─── Individual seeders ───────────────────────────────────────────────────────

async function seedCategories(): Promise<{ inserted: number; deleted: number }> {
  const deleted  = (await CategoryModel.deleteMany({})).deletedCount ?? 0;
  const inserted = (await CategoryModel.insertMany(CATEGORY_SEEDS)).length;
  return { inserted, deleted };
}

async function seedUsers(): Promise<{ inserted: number; deleted: number }> {
  const bcrypt = (await import("bcryptjs")).default;
  const hash   = await bcrypt.hash(SEED_PASSWORD, 10);

  const deleted = (await UserModel.deleteMany({
    _id: { $in: USER_SEEDS.map((u) => new mongoose.Types.ObjectId(u._id)) },
  })).deletedCount ?? 0;

  const docs = USER_SEEDS.map((u) => ({ ...u, password: hash }));
  const inserted = (await UserModel.insertMany(docs, { ordered: false })).length;
  return { inserted, deleted };
}

async function seedVendors(): Promise<{ inserted: number; deleted: number }> {
  const deleted = (await VendorModel.deleteMany({
    _id: { $in: VENDOR_SEEDS.map((v) => new mongoose.Types.ObjectId(v._id)) },
  })).deletedCount ?? 0;

  const docs = VENDOR_SEEDS.map((v) => ({
    ...v,
    _id:     new mongoose.Types.ObjectId(v._id),
    ownerId: new mongoose.Types.ObjectId(v.ownerId),
  }));
  const inserted = (await VendorModel.insertMany(docs, { ordered: false })).length;
  return { inserted, deleted };
}

async function seedProducts(): Promise<{ inserted: number; deleted: number }> {
  const deleted  = (await ProductModel.deleteMany({})).deletedCount ?? 0;
  const docs     = PRODUCT_SEEDS.map((p) => ({
    ...p,
    ...(p.vendorId
      ? { vendorId: new mongoose.Types.ObjectId(p.vendorId) }
      : { vendorId: null }),
  }));
  const inserted = (await ProductModel.insertMany(docs)).length;
  return { inserted, deleted };
}

async function seedReviews(): Promise<{ inserted: number; deleted: number }> {
  const deleted  = (await ReviewModel.deleteMany({})).deletedCount ?? 0;

  const products = await ProductModel.find(
    { reviewCount: { $gt: 0 } },
    { _id: 1, slug: 1, rating: 1, reviewCount: 1 }
  ).lean();

  const reviewDocs = generateReviews(
    products.map((p) => ({
      _id:         p._id as mongoose.Types.ObjectId,
      slug:        p.slug as string,
      rating:      p.rating as number,
      reviewCount: p.reviewCount as number,
    }))
  );

  const withIds = reviewDocs.map((r) => ({
    ...r,
    productId: new mongoose.Types.ObjectId(r.productId.toString()),
    userId:    new mongoose.Types.ObjectId(r.userId.toString()),
  }));

  const inserted = (await ReviewModel.insertMany(withIds, { ordered: false })).length;
  return { inserted, deleted };
}

async function seedOrders(): Promise<{ inserted: number; deleted: number }> {
  const deleted  = (await OrderModel.deleteMany({})).deletedCount ?? 0;

  const products = await ProductModel.find(
    {},
    { _id: 1, name: 1, slug: 1, price: 1, images: 1 }
  ).lean();

  const orderDocs = generateOrders(
    products.map((p) => ({
      _id:    p._id as mongoose.Types.ObjectId,
      name:   p.name as string,
      slug:   p.slug as string,
      price:  p.price as number,
      images: (p.images as string[]) ?? [],
    }))
  );

  const withIds = orderDocs.map((o) => ({
    ...o,
    userId: new mongoose.Types.ObjectId(o.userId),
    items: o.items.map((it) => ({
      ...it,
      productId: it.productId,
    })),
  }));

  const inserted = (await OrderModel.insertMany(withIds, { ordered: false })).length;
  return { inserted, deleted };
}

async function seedOffers(): Promise<{ inserted: number; deleted: number }> {
  function days(n: number) { return new Date(Date.now() + n * 86_400_000); }

  // ── New eligibility fields added to every offer ──────────────────────────
  // eligibleCategories: [] = all categories; non-empty = restricted to those slugs
  // firstOrderOnly: true = only valid for a user's first order
  // usageLimit / perUserLimit: null = unlimited
  const OFFERS = [
    { title: "Weekend Mega Sale",          subtitle: "Up to 30% off fresh food",           description: "Massive savings across our fresh food range every weekend.",        code: "WEEKEND30",   discountType: "percentage", discountValue: 30, minOrderValue: 0,  expiresAt: days(3),   badge: "HOT",       color: "#FFF3E0", emoji: "🥦", category: "fresh-food",        href: "/categories/fresh-food",        order: 1,  isActive: true, eligibleCategories: ["fresh-food","bakery"], eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Free Delivery Over £50",     subtitle: "Shop more, save on delivery",         description: "Enjoy free next-day delivery on all orders over £50.",                             discountType: "freeDelivery", discountValue: 0, minOrderValue: 50, expiresAt: days(30),  badge: "FREE",      color: "#E8F5E9", emoji: "🚚", category: "all",               href: "/products",                     order: 2,  isActive: true, eligibleCategories: [],                     eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Bakery Fresh Every Morning", subtitle: "20% off all bakery items",            description: "Freshly baked discounts. Use code online.",                       code: "FRESHBAKE20", discountType: "percentage", discountValue: 20, minOrderValue: 0,  expiresAt: days(14),  badge: "NEW",       color: "#FFF8E1", emoji: "🥐", category: "bakery",            href: "/categories/bakery",            order: 3,  isActive: true, eligibleCategories: ["bakery"],             eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "£10 Off Your First Order",   subtitle: "New customer exclusive",              description: "Welcome to Prakash! Enjoy £10 off when you spend £30+.",          code: "WELCOME10",   discountType: "fixed",      discountValue: 10, minOrderValue: 30, expiresAt: days(60),  badge: "NEW",       color: "#E3F2FD", emoji: "🎉", category: "all",               href: "/products",                     order: 4,  isActive: true, eligibleCategories: [],                     eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: 1,    firstOrderOnly: true,  usedCount: 0 },
    { title: "Drinks Bonanza",             subtitle: "33% off selected drinks",             description: "Stock up your fridge with our drinks discount.",                  code: "DRINKS3FOR2", discountType: "percentage", discountValue: 33, minOrderValue: 0,  expiresAt: days(7),   badge: "3 FOR 2",   color: "#E1F5FE", emoji: "🥤", category: "drinks",            href: "/categories/drinks",            order: 5,  isActive: true, eligibleCategories: ["drinks"],             eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Frozen Food Fiesta",         subtitle: "Save 25% across frozen range",        description: "25% off our entire frozen range. Convenient and delicious.",      code: "FROZEN25",    discountType: "percentage", discountValue: 25, minOrderValue: 20, expiresAt: days(10),  badge: "SALE",      color: "#E0F7FA", emoji: "❄️", category: "frozen-food",       href: "/categories/frozen-food",       order: 6,  isActive: true, eligibleCategories: ["frozen-food"],        eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Health & Beauty Event",      subtitle: "15% off premium brands",              description: "Treat yourself with 15% off across Health & Beauty.",             code: "BEAUTY15",    discountType: "percentage", discountValue: 15, minOrderValue: 15, expiresAt: days(21),  badge: "EVENT",     color: "#FCE4EC", emoji: "💄", category: "health-beauty",     href: "/categories/health-beauty",     order: 7,  isActive: true, eligibleCategories: ["health-beauty"],      eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "PRAKASH10 — Always On",      subtitle: "10% off any order, any time",         description: "Our signature code. 10% off any order.",                         code: "PRAKASH10",   discountType: "percentage", discountValue: 10, minOrderValue: 0,  expiresAt: days(365), badge: "ALWAYS ON", color: "#EDE7F6", emoji: "🏷️", category: "all",              href: "/products",                     order: 8,  isActive: true, eligibleCategories: [],                     eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Student Discount 20%",       subtitle: "Exclusive student deal",              description: "20% off for verified students. Use code at checkout.",            code: "STUDENT20",   discountType: "percentage", discountValue: 20, minOrderValue: 20, expiresAt: days(90),  badge: "STUDENT",   color: "#E8EAF6", emoji: "🎓", category: "all",               href: "/products",                     order: 9,  isActive: true, eligibleCategories: [],                     eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: 3,    firstOrderOnly: false, usedCount: 0 },
    { title: "Snacks Happy Hour",          subtitle: "25% off treats & snacks",             description: "Grab your favourites at 25% off.",                               code: "SNACKHOUR",   discountType: "percentage", discountValue: 25, minOrderValue: 10, expiresAt: days(5),   badge: "HAPPY HOUR",color: "#FFF9C4", emoji: "🍿", category: "treats-snacks",     href: "/categories/treats-snacks",     order: 10, isActive: true, eligibleCategories: ["treats-snacks"],      eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Organic Week",               subtitle: "15% off all organic products",        description: "15% off ORGANIC-badged items in our fresh food range.",           code: "ORGANIC15",   discountType: "percentage", discountValue: 15, minOrderValue: 0,  expiresAt: days(7),   badge: "ORGANIC",   color: "#F1F8E9", emoji: "🌿", category: "fresh-food",        href: "/categories/fresh-food",        order: 11, isActive: true, eligibleCategories: ["fresh-food"],         eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Tech Tuesday",               subtitle: "£10 off electronics orders",          description: "Every Tuesday, £10 off any electronics & gaming order over £50.", code: "TECHTUESDAY", discountType: "fixed",      discountValue: 10, minOrderValue: 50, expiresAt: days(8),   badge: "WEEKLY",    color: "#E3F2FD", emoji: "🎮", category: "electronics-gaming", href: "/categories/electronics-gaming", order: 12, isActive: true, eligibleCategories: ["electronics-gaming"], eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Pet Pampering Weekend",      subtitle: "20% off pet food and accessories",    description: "Spoil your furry friends with 20% off our entire pets range.",    code: "PETS20",      discountType: "percentage", discountValue: 20, minOrderValue: 15, expiresAt: days(4),   badge: "PETS",      color: "#F9FBE7", emoji: "🐾", category: "pets",              href: "/categories/pets",              order: 13, isActive: true, eligibleCategories: ["pets"],               eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Buy 2 Bakery Items Save £1", subtitle: "Great bakery bundle deal",            description: "Add any 2 bakery items to your basket and save £1.",             code: "BAKE2SAVE",   discountType: "fixed",      discountValue: 1,  minOrderValue: 5,  expiresAt: days(14),  badge: "BUNDLE",    color: "#FFFDE7", emoji: "🧁", category: "bakery",            href: "/categories/bakery",            order: 14, isActive: true, eligibleCategories: ["bakery"],             eligibleProductIds: [], eligiblePincodes: [], usageLimit: null, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
    { title: "Summer Drinks Bundle 30%",   subtitle: "Cool down and save",                  description: "30% off selected summer drinks — juices, water, and soft drinks.",code: "SUMMERDRINK", discountType: "percentage", discountValue: 30, minOrderValue: 25, expiresAt: days(20),  badge: "SUMMER",    color: "#E0F2F1", emoji: "☀️", category: "drinks",            href: "/categories/drinks",            order: 15, isActive: true, eligibleCategories: ["drinks"],             eligibleProductIds: [], eligiblePincodes: ["HA","UB","W","TW"], usageLimit: 500, perUserLimit: null, firstOrderOnly: false, usedCount: 0 },
  ];

  const deleted  = (await OfferModel.deleteMany({})).deletedCount ?? 0;
  const inserted = (await OfferModel.insertMany(OFFERS)).length;
  return { inserted, deleted };
}

async function seedStores(): Promise<{ inserted: number; deleted: number }> {
  const STORES = [
    { name: "Prakash Supermarket — Wembley",   address: "45 High Road",        city: "Wembley",   postcode: "HA9 7AB", phone: "020 8900 1234", email: "wembley@prakashsupermarket.co.uk",   openingHours: { monday: { open:"07:00",close:"22:00",closed:false }, tuesday: { open:"07:00",close:"22:00",closed:false }, wednesday: { open:"07:00",close:"22:00",closed:false }, thursday: { open:"07:00",close:"22:00",closed:false }, friday: { open:"07:00",close:"23:00",closed:false }, saturday: { open:"07:00",close:"23:00",closed:false }, sunday: { open:"09:00",close:"21:00",closed:false } }, amenities: ["Free Parking","Cafe","Pharmacy","ATM","Click & Collect"], isActive: true, lat: 51.5528, lng: -0.2973 },
    { name: "Prakash Supermarket — Harrow",    address: "12 Station Road",     city: "Harrow",    postcode: "HA1 2SQ", phone: "020 8427 5678", email: "harrow@prakashsupermarket.co.uk",    openingHours: { monday: { open:"07:30",close:"21:00",closed:false }, tuesday: { open:"07:30",close:"21:00",closed:false }, wednesday: { open:"07:30",close:"21:00",closed:false }, thursday: { open:"07:30",close:"21:00",closed:false }, friday: { open:"07:30",close:"22:00",closed:false }, saturday: { open:"08:00",close:"22:00",closed:false }, sunday: { open:"10:00",close:"20:00",closed:false } }, amenities: ["Parking","ATM","Click & Collect","Fresh Bakery"], isActive: true, lat: 51.5799, lng: -0.3349 },
    { name: "Prakash Supermarket — Southall",  address: "78 The Broadway",     city: "Southall",  postcode: "UB1 1LW", phone: "020 8574 9012", email: "southall@prakashsupermarket.co.uk",  openingHours: { monday: { open:"06:00",close:"22:00",closed:false }, tuesday: { open:"06:00",close:"22:00",closed:false }, wednesday: { open:"06:00",close:"22:00",closed:false }, thursday: { open:"06:00",close:"22:00",closed:false }, friday: { open:"06:00",close:"23:00",closed:false }, saturday: { open:"06:00",close:"23:00",closed:false }, sunday: { open:"08:00",close:"22:00",closed:false } }, amenities: ["Free Parking","Cafe","ATM","Fresh Bakery","International Foods"], isActive: true, lat: 51.5117, lng: -0.3756 },
    { name: "Prakash Supermarket — Ealing",    address: "33 New Broadway",     city: "Ealing",    postcode: "W5 2XA",  phone: "020 8567 3456", email: "ealing@prakashsupermarket.co.uk",    openingHours: { monday: { open:"07:00",close:"22:00",closed:false }, tuesday: { open:"07:00",close:"22:00",closed:false }, wednesday: { open:"07:00",close:"22:00",closed:false }, thursday: { open:"07:00",close:"22:00",closed:false }, friday: { open:"07:00",close:"22:30",closed:false }, saturday: { open:"07:00",close:"22:30",closed:false }, sunday: { open:"09:00",close:"20:00",closed:false } }, amenities: ["Parking","Pharmacy","ATM","Click & Collect"], isActive: true, lat: 51.5130, lng: -0.3054 },
    { name: "Prakash Supermarket — Hayes",     address: "5 Coldharbour Lane",  city: "Hayes",     postcode: "UB3 3EE", phone: "020 8561 7890", email: "hayes@prakashsupermarket.co.uk",     openingHours: { monday: { open:"07:00",close:"21:00",closed:false }, tuesday: { open:"07:00",close:"21:00",closed:false }, wednesday: { open:"07:00",close:"21:00",closed:false }, thursday: { open:"07:00",close:"21:00",closed:false }, friday: { open:"07:00",close:"22:00",closed:false }, saturday: { open:"08:00",close:"22:00",closed:false }, sunday: { open:"09:00",close:"19:00",closed:false } }, amenities: ["Free Parking","ATM","Fresh Bakery"], isActive: true, lat: 51.5079, lng: -0.4199 },
    { name: "Prakash Supermarket — Greenford", address: "120 Greenford Road",  city: "Greenford", postcode: "UB6 0HG", phone: "020 8578 2345", email: "greenford@prakashsupermarket.co.uk", openingHours: { monday: { open:"07:00",close:"21:00",closed:false }, tuesday: { open:"07:00",close:"21:00",closed:false }, wednesday: { open:"07:00",close:"21:00",closed:false }, thursday: { open:"07:00",close:"21:00",closed:false }, friday: { open:"07:00",close:"22:00",closed:false }, saturday: { open:"08:00",close:"22:00",closed:false }, sunday: { open:"10:00",close:"18:00",closed:false } }, amenities: ["Parking","ATM"], isActive: true, lat: 51.5340, lng: -0.3469 },
    { name: "Prakash Supermarket — Uxbridge",  address: "88 High Street",      city: "Uxbridge",  postcode: "UB8 1JQ", phone: "01895 231 789", email: "uxbridge@prakashsupermarket.co.uk",  openingHours: { monday: { open:"07:00",close:"21:30",closed:false }, tuesday: { open:"07:00",close:"21:30",closed:false }, wednesday: { open:"07:00",close:"21:30",closed:false }, thursday: { open:"07:00",close:"21:30",closed:false }, friday: { open:"07:00",close:"22:00",closed:false }, saturday: { open:"07:30",close:"22:00",closed:false }, sunday: { open:"09:30",close:"20:00",closed:false } }, amenities: ["Free Parking","Cafe","ATM","Click & Collect","Pharmacy"], isActive: true, lat: 51.5440, lng: -0.4790 },
  ];
  const deleted  = (await StoreModel.deleteMany({})).deletedCount ?? 0;
  const inserted = (await StoreModel.insertMany(STORES)).length;
  return { inserted, deleted };
}

async function seedFaqs(): Promise<{ inserted: number; deleted: number }> {
  const FAQS = [
    { question:"What are your delivery options?",               answer:"We offer next-day delivery (free over £40, otherwise £3.99) and Click & Collect from any of our seven stores, usually within 2 hours.",                                               category:"delivery", order:1,  isActive:true },
    { question:"How do I track my order?",                      answer:"Once your order ships you will receive an email with a tracking link. You can also view live order status in your Account → Orders page.",                                              category:"orders",   order:2,  isActive:true },
    { question:"Can I change or cancel my order?",              answer:"Orders can be modified or cancelled within 30 minutes of placement. After that, please contact our support team and we will do our best to help.",                                      category:"orders",   order:3,  isActive:true },
    { question:"What payment methods do you accept?",           answer:"We accept all major debit and credit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay and Klarna Buy Now Pay Later.",                                                             category:"payments", order:4,  isActive:true },
    { question:"Is my payment information secure?",             answer:"Yes. All transactions are processed over an encrypted SSL connection and we never store your full card details on our servers.",                                                        category:"payments", order:5,  isActive:true },
    { question:"What is your returns policy?",                  answer:"Non-perishable items can be returned within 30 days of purchase in original packaging for a full refund. Fresh and chilled items are non-returnable unless faulty.",                    category:"returns",  order:6,  isActive:true },
    { question:"How do I return a faulty item?",                answer:"Contact our support team within 7 days with a photo of the fault and we will arrange a replacement or full refund, including return postage.",                                          category:"returns",  order:7,  isActive:true },
    { question:"How do I create an account?",                   answer:"Click 'Register' in the top navigation bar, fill in your name, email and password, and you're ready. You can also sign up during checkout.",                                           category:"account",  order:8,  isActive:true },
    { question:"How do I reset my password?",                   answer:"Click 'Forgot password' on the login page and enter your email address. You will receive a password reset link within a few minutes.",                                                  category:"account",  order:9,  isActive:true },
    { question:"Do you offer a student discount?",              answer:"Yes! Students get 20% off with code STUDENT20. Verify your student status via UNiDAYS when prompted at checkout.",                                                                     category:"general",  order:10, isActive:true },
    { question:"Are your fresh products really fresh?",         answer:"Yes. Our fresh food range is sourced daily from local farms and suppliers. Chilled items are delivered in insulated packaging to maintain temperature.",                                category:"general",  order:11, isActive:true },
    { question:"Do you offer Click & Collect?",                 answer:"Yes. Select Click & Collect at checkout, choose your nearest store, and your order will be ready within 2 hours. Look for the dedicated collection point on arrival.",                  category:"delivery", order:12, isActive:true },
    { question:"What happens if an item is out of stock?",      answer:"We will notify you by email and offer a suitable substitute. If you decline, you will receive a full refund for that item within 3–5 working days.",                                    category:"orders",   order:13, isActive:true },
    { question:"Can I use multiple promo codes?",               answer:"Only one promo code can be applied per order. Promo codes cannot be combined with other offers unless stated otherwise.",                                                               category:"payments", order:14, isActive:true },
    { question:"How do I earn and redeem loyalty points?",      answer:"You earn 1 point for every £1 spent. Points appear in your account within 24 hours of delivery and can be redeemed at checkout (100 points = £1 off).",                               category:"account",  order:15, isActive:true },
  ];
  const deleted  = (await FaqModel.deleteMany({})).deletedCount ?? 0;
  const inserted = (await FaqModel.insertMany(FAQS)).length;
  return { inserted, deleted };
}

async function seedHomepage(): Promise<{ inserted: number; deleted: number }> {
  function days(n: number) { return new Date(Date.now() + n * 86_400_000); }

  const SECTIONS = [
    { key:"hero-banner",    title:"Hero Banner",                               type:"hero-banner",        order:0, isActive:true, items:[
      { title:"Fresh Food, Every Day",          subtitle:"Locally sourced, quality guaranteed — delivered straight to your door.",           badge:"Shop Fresh Food",        href:"/categories/fresh-food",                color:"from-[#0F4C75] to-[#0A3352]",   emoji:"🥦", order:1 },
      { title:"Up to 50% Off Selected Items",   subtitle:"Huge savings across bakery, drinks, snacks and more. Limited time only.",         badge:"View Deals",              href:"/products?sortBy=price-asc",             color:"from-[#E65100] to-[#BF360C]",   emoji:"🛒", order:2 },
      { title:"Free Delivery Over £40",         subtitle:"Fill your basket and we'll bring it straight to you, free of charge.",            badge:"Start Shopping",          href:"/products",                              color:"from-[#1B5E20] to-[#0A2E0D]",   emoji:"🚚", order:3 },
      { title:"Electronics & Gaming",           subtitle:"Latest tech, gaming gear and home entertainment at supermarket prices.",          badge:"Explore Electronics",     href:"/categories/electronics-gaming",         color:"from-[#4A148C] to-[#2A0A5E]",   emoji:"🎮", order:4 },
    ]},
    { key:"whats-new",     title:"What's new this week?",                    subtitle:"Fresh arrivals and seasonal picks, updated every week",                    type:"product-carousel",   order:1, isActive:true, ctaLabel:"Shop all new",      ctaHref:"/products?sortBy=newest", items:[{title:"Organic Whole Milk 2L",brand:"Prakash Organic",price:1.79,emoji:"🥛",color:"#EFF6FF",badge:"New", href:"/categories/fresh-food",order:1},{title:"Sourdough Bloomer Loaf",brand:"Golden Crust",price:2.49,emoji:"🍞",color:"#FFFBEB",badge:"New",href:"/categories/bakery",order:2},{title:"Sparkling Elderflower",brand:"Fentimans",price:1.59,emoji:"🌸",color:"#FDF4FF",badge:"New",href:"/categories/drinks",order:3},{title:"Mixed Berry Granola",brand:"Prakash Finest",price:3.49,emoji:"🫐",color:"#F0FDF4",badge:"New",href:"/categories/food-cupboard",order:4},{title:"Smoked Scottish Salmon",brand:"Scottish Select",price:4.99,emoji:"🐟",color:"#FFF1F2",badge:"New",href:"/categories/fresh-food",order:5},{title:"Dark Chocolate 85%",brand:"Lindt",price:2.29,emoji:"🍫",color:"#FEF3C7",badge:"New",href:"/categories/treats-snacks",order:6},{title:"Greek Style Yoghurt",brand:"Chobani",price:2.79,emoji:"🍶",color:"#F0F9FF",badge:"New",href:"/categories/fresh-food",order:7},{title:"Avocado Dip Guacamole",brand:"Wholly Guacamole",price:2.49,emoji:"🥑",color:"#F0FDF4",badge:"New",href:"/categories/fresh-food",order:8}]},
    { key:"top-picks",     title:"Top picks for you this week",               subtitle:"Handpicked by our team just for you",                                      type:"product-carousel",   order:2, isActive:true, ctaLabel:"See all picks",     ctaHref:"/products?sortBy=rating", items:[{title:"Mature Cheddar 400g",brand:"Cathedral City",price:3.25,emoji:"🧀",color:"#FEF3C7",badge:"Popular",href:"/categories/fresh-food",order:1},{title:"Free Range Eggs 6pk",brand:"Happy Hens",price:1.89,emoji:"🥚",color:"#FFFBEB",badge:"Popular",href:"/categories/fresh-food",order:2},{title:"Chicken Breast Fillets",brand:"Prakash Finest",price:3.75,emoji:"🍗",color:"#FFF7ED",badge:"Popular",href:"/categories/fresh-food",order:3},{title:"Tilda Basmati Rice 2kg",brand:"Tilda",price:4.50,emoji:"🍚",color:"#F9FAFB",badge:"Popular",href:"/categories/food-cupboard",order:4},{title:"Extra Virgin Olive Oil",brand:"Filippo Berio",price:5.75,emoji:"🫒",color:"#F0FDF4",badge:"Popular",href:"/categories/food-cupboard",order:5},{title:"Barilla Penne Pasta",brand:"Barilla",price:1.25,emoji:"🍝",color:"#FFFBEB",badge:"Popular",href:"/categories/food-cupboard",order:6},{title:"Buxton Still Water 12pk",brand:"Buxton",price:3.99,emoji:"💧",color:"#EFF6FF",badge:"Popular",href:"/categories/drinks",order:7},{title:"Butter Croissants 4pk",brand:"Golden Crust",price:1.75,emoji:"🥐",color:"#FEF9C3",badge:"Popular",href:"/categories/bakery",order:8}]},
    { key:"popular-offers", title:"Popular offers ending soon",               subtitle:"Grab these deals before they're gone",                                    type:"offer-cards",        order:3, isActive:true, ctaLabel:"All offers",        ctaHref:"/offers", items:[{title:"Heinz Baked Beans 4pk",brand:"Heinz",price:2.00,originalPrice:2.89,discount:31,emoji:"🫘",color:"#FFF0F3",badge:"31% off",expiresAt:days(2),href:"/categories/food-cupboard",order:1},{title:"Tropicana Orange Juice",brand:"Tropicana",price:2.49,originalPrice:2.99,discount:17,emoji:"🍊",color:"#FFF7ED",badge:"17% off",expiresAt:days(3),href:"/categories/drinks",order:2},{title:"Heinz Tomato Ketchup",brand:"Heinz",price:2.25,originalPrice:2.79,discount:19,emoji:"🍅",color:"#FFF1F2",badge:"19% off",expiresAt:days(1),href:"/categories/food-cupboard",order:3},{title:"Kellogg's Cornflakes",brand:"Kellogg's",price:2.49,originalPrice:3.49,discount:29,emoji:"🌾",color:"#FFFBEB",badge:"29% off",expiresAt:days(4),href:"/categories/food-cupboard",order:4},{title:"McVitie's Digestives",brand:"McVitie's",price:1.25,originalPrice:1.89,discount:34,emoji:"🍪",color:"#FEF9C3",badge:"34% off",expiresAt:days(2),href:"/categories/treats-snacks",order:5},{title:"Arla Whole Milk 4pt",brand:"Arla",price:1.30,originalPrice:1.65,discount:21,emoji:"🥛",color:"#EFF6FF",badge:"21% off",expiresAt:days(5),href:"/categories/fresh-food",order:6},{title:"Walkers Crisps 6pk",brand:"Walkers",price:2.00,originalPrice:2.79,discount:28,emoji:"🥔",color:"#FEF3C7",badge:"28% off",expiresAt:days(3),href:"/categories/treats-snacks",order:7},{title:"Coca-Cola 6pk Cans",brand:"Coca-Cola",price:3.99,originalPrice:4.99,discount:20,emoji:"🥤",color:"#FFF0F3",badge:"20% off",expiresAt:days(2),href:"/categories/drinks",order:8}]},
    { key:"inspiration",   title:"Inspiration from sellers' big brands",       subtitle:"Discover what our brand partners have in store",                          type:"brand-inspiration",  order:4, isActive:true, items:[{title:"Heinz",subtitle:"The nation's favourite since 1869",description:"50+ iconic varieties — from ketchup to beans and beyond",emoji:"🍅",color:"#C41230",href:"/categories/food-cupboard",order:1},{title:"Cadbury",subtitle:"Real chocolate. Real indulgence.",description:"Britain's best-loved chocolate — explore the full range",emoji:"🍫",color:"#7B2D8B",href:"/categories/treats-snacks",order:2},{title:"Kellogg's",subtitle:"Start your day the right way",description:"Cereals, snacks and more for the whole family",emoji:"🌾",color:"#D62828",href:"/categories/food-cupboard",order:3},{title:"Coca-Cola",subtitle:"Taste the feeling",description:"Refresh your world with the world's favourite drink",emoji:"🥤",color:"#E61B2A",href:"/categories/drinks",order:4}]},
    { key:"trending",      title:"Trending now",                               subtitle:"What everyone is adding to their baskets this week",                      type:"product-carousel",   order:5, isActive:true, ctaLabel:"See all trending",  ctaHref:"/products?sortBy=rating", items:[{title:"GT's Kombucha Ginger Lemon",brand:"GT's",price:2.99,emoji:"🍵",color:"#F0FDF4",badge:"🔥 Hot",href:"/categories/drinks",order:1},{title:"Quaker Porridge Oats 1kg",brand:"Quaker",price:2.25,emoji:"🥣",color:"#FFFBEB",badge:"🔥 Hot",href:"/categories/food-cupboard",order:2},{title:"Oatly Barista Oat Drink",brand:"Oatly",price:2.25,emoji:"🌾",color:"#FEF9C3",badge:"🔥 Hot",href:"/categories/drinks",order:3},{title:"Meridian Peanut Butter",brand:"Meridian",price:3.49,emoji:"🥜",color:"#FEF3C7",badge:"🔥 Hot",href:"/categories/food-cupboard",order:4},{title:"Clipper Organic Green Tea",brand:"Clipper",price:2.49,emoji:"🍵",color:"#F0FDF4",badge:"🔥 Hot",href:"/categories/drinks",order:5},{title:"Red Lentils 500g",brand:"Prakash",price:1.00,emoji:"🌱",color:"#F0F9FF",badge:"🔥 Hot",href:"/categories/food-cupboard",order:6},{title:"Vita Coco Coconut Water",brand:"Vita Coco",price:2.49,emoji:"🥥",color:"#F0FDF4",badge:"🔥 Hot",href:"/categories/drinks",order:7},{title:"Quorn Mince 500g",brand:"Quorn",price:3.25,emoji:"🌿",color:"#F0FDF4",badge:"🔥 Hot",href:"/categories/frozen-food",order:8}]},
    { key:"ways-to-shop",  title:"Ways to shop and save",                      subtitle:"Making great value shopping easier for everyone",                         type:"info-cards",         order:6, isActive:true, items:[{title:"Free Next-Day Delivery",description:"Free on all orders over £40. Fast, reliable, tracked.",emoji:"🚚",color:"#EFF6FF",href:"/faq",order:1},{title:"Click & Collect",description:"Order online and pick up from your nearest store.",emoji:"🏪",color:"#F0FDF4",href:"/store-locator",order:2},{title:"Price Match Promise",description:"Find it cheaper elsewhere? We'll match the price.",emoji:"🏷️",color:"#FFF7ED",href:"/faq",order:3},{title:"Loyalty Points",description:"Earn 1 point per £1 spent — redeem on any order.",emoji:"⭐",color:"#FEFCE8",href:"/account",order:4},{title:"Student Discount",description:"Exclusive 20% off sitewide — verify your status.",emoji:"🎓",color:"#FDF4FF",href:"/faq",order:5},{title:"Subscribe & Save",description:"Set up auto-delivery and save 15% on every order.",emoji:"♻️",color:"#F0F9FF",href:"/products",order:6}]},
    { key:"discover-more", title:"Discover more from Prakash",                 subtitle:"Collections and ranges curated just for you",                             type:"category-tiles",     order:7, isActive:true, items:[{title:"Meal Deals",subtitle:"Lunch sorted from £3",emoji:"🥪",color:"#EFF6FF",href:"/categories/food-cupboard",order:1},{title:"Healthy Living",subtitle:"Nutritious and delicious picks",emoji:"🥗",color:"#F0FDF4",href:"/categories/fresh-food",order:2},{title:"World Cuisine",subtitle:"Flavours from around the globe",emoji:"🌍",color:"#FFF7ED",href:"/categories/food-cupboard",order:3},{title:"Plant-Based",subtitle:"Vegan & vegetarian favourites",emoji:"🌱",color:"#F0FDF4",href:"/categories/fresh-food",order:4},{title:"Family Favourites",subtitle:"Everyone will love these",emoji:"👨‍👩‍👧",color:"#FDF4FF",href:"/categories/treats-snacks",order:5},{title:"Student Essentials",subtitle:"Budget-friendly basics",emoji:"📚",color:"#FEFCE8",href:"/categories/food-cupboard",order:6},{title:"British Classics",subtitle:"Homegrown and handpicked",emoji:"🇬🇧",color:"#FFF1F2",href:"/categories/food-cupboard",order:7},{title:"Summer BBQ",subtitle:"Fire up the grill",emoji:"🔥",color:"#FFF7ED",href:"/categories/fresh-food",order:8}]},
    { key:"shop-by-brand", title:"Shop by brand",                              subtitle:"Your favourite brands, all in one place",                                 type:"brand-grid",         order:8, isActive:true, ctaLabel:"All brands",        ctaHref:"/categories", items:[{title:"Heinz",emoji:"🍅",color:"#C41230",href:"/categories/food-cupboard",order:1},{title:"Cadbury",emoji:"🍫",color:"#7B2D8B",href:"/categories/treats-snacks",order:2},{title:"Coca-Cola",emoji:"🥤",color:"#E61B2A",href:"/categories/drinks",order:3},{title:"Walkers",emoji:"🥔",color:"#003087",href:"/categories/treats-snacks",order:4},{title:"Kellogg's",emoji:"🌾",color:"#D62828",href:"/categories/food-cupboard",order:5},{title:"PG Tips",emoji:"🍵",color:"#00703C",href:"/categories/drinks",order:6},{title:"Warburtons",emoji:"🍞",color:"#E87722",href:"/categories/bakery",order:7},{title:"Nestlé",emoji:"☕",color:"#D62828",href:"/categories/treats-snacks",order:8},{title:"Andrex",emoji:"🐶",color:"#F5A800",href:"/categories/household",order:9},{title:"Fairy",emoji:"🫧",color:"#00A9CE",href:"/categories/household",order:10},{title:"Quorn",emoji:"🌿",color:"#4CAF50",href:"/categories/fresh-food",order:11},{title:"Hovis",emoji:"🌾",color:"#8B2500",href:"/categories/bakery",order:12}]},
    { key:"explore-more",  title:"Even more to explore",                       subtitle:"There's always something new to discover at Prakash",                     type:"explore-cards",      order:9, isActive:true, items:[{title:"Summer BBQ Essentials",subtitle:"Everything for the perfect cookout",emoji:"🍖",color:"#FFF7ED",href:"/categories/fresh-food",order:1},{title:"New Season Arrivals",subtitle:"Just landed in store this week",emoji:"✨",color:"#F0F9FF",href:"/products?sortBy=newest",order:2},{title:"Budget Buys Under £1",subtitle:"Great quality at an unbeatable price",emoji:"💰",color:"#F0FDF4",href:"/offers",order:3},{title:"Recipe Kits",subtitle:"Cook like a pro in 30 minutes",emoji:"👨‍🍳",color:"#FDF4FF",href:"/categories/food-cupboard",order:4},{title:"Organic Range",subtitle:"Better for you and the planet",emoji:"🌿",color:"#F0FDF4",href:"/categories/fresh-food",order:5},{title:"Kids' Lunchbox Picks",subtitle:"Healthy and fun for little ones",emoji:"🎒",color:"#FFF1F2",href:"/categories/treats-snacks",order:6}]},
  ];

  let inserted = 0;
  for (const s of SECTIONS) {
    const result = await HomepageSection.updateOne({ key: s.key }, { $set: s }, { upsert: true });
    if (result.upsertedCount) inserted++;
  }
  return { inserted, deleted: 0 };
}

// ─── Route handler ────────────────────────────────────────────────────────────

const ALL_COLLECTIONS = [
  "categories","users","vendors","products","reviews","orders",
  "offers","stores","faqs","homepage",
] as const;

type CollectionName = (typeof ALL_COLLECTIONS)[number];

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  await connectDB();

  // parse optional partial-seed body
  let requestedCollections: CollectionName[] = [...ALL_COLLECTIONS];
  try {
    const body = await req.json();
    if (Array.isArray(body?.collections) && body.collections.length > 0) {
      requestedCollections = body.collections.filter((c: string) =>
        (ALL_COLLECTIONS as readonly string[]).includes(c)
      ) as CollectionName[];
    }
  } catch {
    // no body — seed everything
  }

  const results: SeedResult[] = [];
  const totalStart = Date.now();

  const run = (name: CollectionName, fn: () => Promise<{ inserted: number; deleted: number }>) =>
    requestedCollections.includes(name) ? runSeeder(name, fn) : null;

  const catResult    = run("categories", seedCategories);
  const usersResult  = run("users",      seedUsers);

  for (const p of [catResult, usersResult]) {
    if (p) results.push(await p);
  }

  const vendorResult  = run("vendors",  seedVendors);
  if (vendorResult) results.push(await vendorResult);

  const productResult = run("products", seedProducts);
  if (productResult) results.push(await productResult);

  const reviewResult  = run("reviews",  seedReviews);
  const orderResult   = run("orders",   seedOrders);
  const offerResult   = run("offers",   seedOffers);
  const storeResult   = run("stores",   seedStores);
  const faqResult     = run("faqs",     seedFaqs);
  const homeResult    = run("homepage", seedHomepage);

  for (const p of [reviewResult, orderResult, offerResult, storeResult, faqResult, homeResult]) {
    if (p) results.push(await p);
  }

  return NextResponse.json({
    success: true,
    results,
    totalMs: Date.now() - totalStart,
    collectionsSeeded: results.map((r) => r.collection),
  });
}
