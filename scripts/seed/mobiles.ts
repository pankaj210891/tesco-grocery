/**
 * Mobiles seed — Electronics & Gaming > Mobiles (L1) > 5 L2 subcategories
 *
 * Inserts:
 *   • "Mobiles" L1 category under "Electronics & Gaming"
 *   • 5 L2 subcategories (Android Phones, iPhone & Apple, Budget Smartphones,
 *                          5G Smartphones, Flagship Phones)
 *   • CategoryAttributes for "electronics & gaming" (covers all electronics + mobile-specific)
 *   • 10 products per L2 = 50 products total with storage+colour variants and 3-4 images each
 *
 * Run:
 *   npm run seed:mobiles
 */

import * as path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import { connectDB } from "../../src/lib/db/mongoose";
import CategoryModel from "../../src/lib/db/models/category.model";
import CategoryAttributesModel from "../../src/lib/db/models/category-attributes.model";
import ProductModel from "../../src/lib/db/models/product.model";
import { VENDOR_IDS, VENDOR_NAMES } from "../../src/lib/data/seeds/ids";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const GBP_TO_INR = 106;
const toINR = (gbp: number) => Math.round(gbp * GBP_TO_INR);
const rand  = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// ─── Image pools ─────────────────────────────────────────────────────────────

const BASE = "https://images.unsplash.com/photo";

const MOBILE_IMGS = [
  `${BASE}-1592750475338-74b7b21085ab?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1574755393849-623942496936?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1601784551446-20c9e07cdbdb?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1614083006873-b7e0bab60ac3?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1570101428030-ca2f0f2d2e8b?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1580910051074-3eb694886505?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1556803988069-4547c6298bc8?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1583573636537-25e00a9e53ce?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1598327105666-5b89351aff97?auto=format&fit=crop&w=600&q=80`,
  `${BASE}-1521327485754-3e77823a00d3?auto=format&fit=crop&w=600&q=80`,
];

function pickImages(seed: number, count = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(MOBILE_IMGS[(seed + i) % MOBILE_IMGS.length]);
  }
  return out;
}

// ─── Storage / colour variants ────────────────────────────────────────────────

interface StorageOpt { label: string; priceMult: number }
const STORAGE_OPTS: StorageOpt[] = [
  { label: "128GB", priceMult: 1.0 },
  { label: "256GB", priceMult: 1.2 },
  { label: "512GB", priceMult: 1.5 },
];
export const COLOUR_OPTS = ["Midnight Black", "Pearl White", "Cosmic Blue", "Forest Green", "Lavender Purple"];

let skuCounter = 8000;
const nextSku = (prefix = "MOB") => `${prefix}-${String(++skuCounter).padStart(6, "0")}`;

function makeVariants(
  base: { priceGBP: number; storages: StorageOpt[]; colours: string[] }
) {
  const rows: object[] = [];
  for (const s of base.storages) {
    for (const colour of base.colours) {
      rows.push({
        label:         `${s.label} / ${colour}`,
        sku:           nextSku(),
        price:         toINR(base.priceGBP * s.priceMult),
        originalPrice: Math.random() < 0.4 ? toINR(base.priceGBP * s.priceMult * 1.15) : null,
        stockQuantity: rand(5, 120),
        inStock:       true,
      });
    }
  }
  return rows;
}

// ─── Mobile product definitions ───────────────────────────────────────────────

interface MobileDef {
  name:       string;
  brand:      string;
  priceGBP:   number;
  origGBP?:   number;
  os:         string;
  ram:        string;
  storage:    string;
  screenSize: string;
  cameraMp:   string;
  battery:    string;
  network:    "4G" | "5G";
  color:      string;
  storages:   StorageOpt[];
  colours:    string[];
  imgSeed:    number;
}

const ANDROID_PHONES: MobileDef[] = [
  { name: "Samsung Galaxy A54 5G",       brand: "Samsung",  priceGBP: 329, os: "Android 14", ram: "8GB",  storage: "128GB", screenSize: '6.4"', cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Awesome Violet",  storages: STORAGE_OPTS.slice(0, 2), colours: ["Awesome Violet", "Awesome Graphite", "Awesome Iceblue"], imgSeed: 0 },
  { name: "Google Pixel 8a",             brand: "Google",   priceGBP: 499, os: "Android 14", ram: "8GB",  storage: "128GB", screenSize: '6.1"', cameraMp: "64MP",  battery: "4492mAh", network: "5G", color: "Bay Blue",        storages: STORAGE_OPTS.slice(0, 2), colours: ["Bay Blue", "Obsidian", "Porcelain", "Aloe"], imgSeed: 2 },
  { name: "OnePlus Nord CE3 Lite 5G",    brand: "OnePlus",  priceGBP: 219, os: "Android 14", ram: "8GB",  storage: "256GB", screenSize: '6.72"', cameraMp: "108MP", battery: "5000mAh", network: "5G", color: "Pastel Lime",     storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.18 }], colours: ["Pastel Lime", "Chromatic Gray"], imgSeed: 4 },
  { name: "Xiaomi Redmi Note 13 Pro",    brand: "Xiaomi",   priceGBP: 289, os: "Android 13", ram: "12GB", storage: "256GB", screenSize: '6.67"', cameraMp: "200MP", battery: "5100mAh", network: "4G", color: "Midnight Black",  storages: STORAGE_OPTS.slice(0, 2), colours: ["Midnight Black", "Coral Purple", "Arctic White"], imgSeed: 6 },
  { name: "Motorola Edge 40",            brand: "Motorola", priceGBP: 349, os: "Android 13", ram: "8GB",  storage: "256GB", screenSize: '6.55"', cameraMp: "50MP",  battery: "4400mAh", network: "5G", color: "Lunar Blue",      storages: STORAGE_OPTS.slice(0, 2), colours: ["Lunar Blue", "Eclipse Black"], imgSeed: 8 },
  { name: "Realme 11 Pro+ 5G",           brand: "Realme",   priceGBP: 369, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '6.7"',  cameraMp: "200MP", battery: "5000mAh", network: "5G", color: "Sunrise Beige",   storages: STORAGE_OPTS.slice(0, 2), colours: ["Sunrise Beige", "Astral Black"], imgSeed: 10 },
  { name: "OPPO Reno 11 F 5G",           brand: "OPPO",     priceGBP: 299, os: "Android 14", ram: "8GB",  storage: "256GB", screenSize: '6.7"',  cameraMp: "64MP",  battery: "5000mAh", network: "5G", color: "Coral Purple",    storages: STORAGE_OPTS.slice(0, 2), colours: ["Coral Purple", "Palm Green", "Ocean Blue"], imgSeed: 1 },
  { name: "Vivo V30 Pro 5G",             brand: "Vivo",     priceGBP: 449, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '6.78"', cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Peacock Green",    storages: STORAGE_OPTS.slice(0, 2), colours: ["Peacock Green", "Hibiscus Red"], imgSeed: 3 },
  { name: "Samsung Galaxy A35 5G",       brand: "Samsung",  priceGBP: 279, os: "Android 14", ram: "6GB",  storage: "128GB", screenSize: '6.6"',  cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Awesome Iceblue", storages: STORAGE_OPTS.slice(0, 2), colours: ["Awesome Iceblue", "Awesome Navy", "Awesome Lilac"], imgSeed: 5 },
  { name: "Xiaomi 14 5G",                brand: "Xiaomi",   priceGBP: 729, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '6.36"', cameraMp: "50MP",  battery: "4610mAh", network: "5G", color: "Black",           storages: STORAGE_OPTS.slice(0, 3), colours: ["Black", "White", "Jade Green"], imgSeed: 7 },
];

const IPHONE_APPLE: MobileDef[] = [
  { name: "Apple iPhone 15 128GB",       brand: "Apple", priceGBP: 799,  os: "iOS 17", ram: "6GB",  storage: "128GB", screenSize: '6.1"', cameraMp: "48MP", battery: "3877mAh", network: "5G", color: "Black",         storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.15 }, { label: "512GB", priceMult: 1.35 }], colours: ["Black", "Blue", "Green", "Yellow", "Pink"], imgSeed: 0 },
  { name: "Apple iPhone 15 Plus",        brand: "Apple", priceGBP: 899,  os: "iOS 17", ram: "6GB",  storage: "128GB", screenSize: '6.7"', cameraMp: "48MP", battery: "4383mAh", network: "5G", color: "Blue",          storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.14 }, { label: "512GB", priceMult: 1.33 }], colours: ["Blue", "Yellow", "Pink", "Green", "Black"], imgSeed: 2 },
  { name: "Apple iPhone 15 Pro 256GB",   brand: "Apple", priceGBP: 1099, os: "iOS 17", ram: "8GB",  storage: "256GB", screenSize: '6.1"', cameraMp: "48MP", battery: "3274mAh", network: "5G", color: "Natural Titanium", storages: [{ label: "128GB", priceMult: 0.91 }, { label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.23 }, { label: "1TB", priceMult: 1.48 }], colours: ["Natural Titanium", "Black Titanium", "White Titanium", "Blue Titanium"], imgSeed: 4 },
  { name: "Apple iPhone 15 Pro Max",     brand: "Apple", priceGBP: 1199, os: "iOS 17", ram: "8GB",  storage: "256GB", screenSize: '6.7"', cameraMp: "48MP", battery: "4422mAh", network: "5G", color: "Natural Titanium", storages: [{ label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.21 }, { label: "1TB", priceMult: 1.45 }], colours: ["Natural Titanium", "Black Titanium", "White Titanium", "Blue Titanium"], imgSeed: 6 },
  { name: "Apple iPhone 14 128GB",       brand: "Apple", priceGBP: 699,  os: "iOS 17", ram: "6GB",  storage: "128GB", screenSize: '6.1"', cameraMp: "12MP", battery: "3279mAh", network: "5G", color: "Midnight",      storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.16 }, { label: "512GB", priceMult: 1.38 }], colours: ["Midnight", "Starlight", "Blue", "Purple", "Red"], imgSeed: 8 },
  { name: "Apple iPhone 14 Plus",        brand: "Apple", priceGBP: 799,  os: "iOS 17", ram: "6GB",  storage: "128GB", screenSize: '6.7"', cameraMp: "12MP", battery: "4325mAh", network: "5G", color: "Starlight",     storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.15 }, { label: "512GB", priceMult: 1.35 }], colours: ["Starlight", "Midnight", "Blue", "Purple", "Red"], imgSeed: 10 },
  { name: "Apple iPhone SE 3rd Gen",     brand: "Apple", priceGBP: 499,  os: "iOS 17", ram: "4GB",  storage: "64GB",  screenSize: '4.7"', cameraMp: "12MP", battery: "2018mAh", network: "5G", color: "Midnight",      storages: [{ label: "64GB", priceMult: 1 }, { label: "128GB", priceMult: 1.12 }, { label: "256GB", priceMult: 1.27 }], colours: ["Midnight", "Starlight", "Red"], imgSeed: 1 },
  { name: "Apple iPhone 13 128GB",       brand: "Apple", priceGBP: 599,  os: "iOS 17", ram: "4GB",  storage: "128GB", screenSize: '6.1"', cameraMp: "12MP", battery: "3227mAh", network: "5G", color: "Midnight",      storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.16 }, { label: "512GB", priceMult: 1.37 }], colours: ["Midnight", "Starlight", "Blue", "Pink", "Red", "Green"], imgSeed: 3 },
  { name: "Apple iPhone 15 Pro 512GB",   brand: "Apple", priceGBP: 1349, os: "iOS 17", ram: "8GB",  storage: "512GB", screenSize: '6.1"', cameraMp: "48MP", battery: "3274mAh", network: "5G", color: "Blue Titanium",  storages: [{ label: "512GB", priceMult: 1 }, { label: "1TB", priceMult: 1.2 }], colours: ["Blue Titanium", "Black Titanium", "White Titanium"], imgSeed: 5 },
  { name: "Apple iPhone 14 Pro Max",     brand: "Apple", priceGBP: 1099, os: "iOS 17", ram: "6GB",  storage: "256GB", screenSize: '6.7"', cameraMp: "48MP", battery: "4323mAh", network: "5G", color: "Deep Purple",    storages: [{ label: "128GB", priceMult: 0.89 }, { label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.23 }, { label: "1TB", priceMult: 1.47 }], colours: ["Deep Purple", "Gold", "Silver", "Space Black"], imgSeed: 7 },
];

const BUDGET_SMARTPHONES: MobileDef[] = [
  { name: "Motorola Moto G54 5G",        brand: "Motorola", priceGBP: 149, os: "Android 14", ram: "8GB",  storage: "256GB", screenSize: '6.5"',  cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Pearl Blue",   storages: [{ label: "128GB", priceMult: 0.9 }, { label: "256GB", priceMult: 1 }], colours: ["Pearl Blue", "Midnight Blue"], imgSeed: 0 },
  { name: "Nokia G42 5G",                brand: "Nokia",    priceGBP: 159, os: "Android 13", ram: "6GB",  storage: "128GB", screenSize: '6.56"', cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "So Purple",    storages: [{ label: "128GB", priceMult: 1 }], colours: ["So Purple", "So Blue", "So Grey"], imgSeed: 2 },
  { name: "Realme C53",                  brand: "Realme",   priceGBP: 129, os: "Android 13", ram: "6GB",  storage: "128GB", screenSize: '6.74"', cameraMp: "50MP",  battery: "5000mAh", network: "4G", color: "Champion Gold", storages: [{ label: "128GB", priceMult: 1 }], colours: ["Champion Gold", "Mighty Black"], imgSeed: 4 },
  { name: "OPPO A79 5G",                 brand: "OPPO",     priceGBP: 169, os: "Android 13", ram: "8GB",  storage: "256GB", screenSize: '6.72"', cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Mystery Black", storages: [{ label: "256GB", priceMult: 1 }], colours: ["Mystery Black", "Glowing Blue"], imgSeed: 6 },
  { name: "Samsung Galaxy A15",          brand: "Samsung",  priceGBP: 139, os: "Android 14", ram: "4GB",  storage: "128GB", screenSize: '6.5"',  cameraMp: "50MP",  battery: "5000mAh", network: "4G", color: "Blue Black",   storages: [{ label: "128GB", priceMult: 1 }], colours: ["Blue Black", "Light Blue", "Yellow"], imgSeed: 8 },
  { name: "Xiaomi Redmi 13C",            brand: "Xiaomi",   priceGBP: 109, os: "Android 13", ram: "4GB",  storage: "128GB", screenSize: '6.74"', cameraMp: "50MP",  battery: "5000mAh", network: "4G", color: "Clover Green", storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.18 }], colours: ["Clover Green", "Navy Blue", "Starlight Black"], imgSeed: 10 },
  { name: "Vivo Y28 4G",                 brand: "Vivo",     priceGBP: 129, os: "Android 14", ram: "6GB",  storage: "128GB", screenSize: '6.5"',  cameraMp: "50MP",  battery: "6000mAh", network: "4G", color: "Sapphire Blue", storages: [{ label: "128GB", priceMult: 1 }], colours: ["Sapphire Blue", "Golden Black"], imgSeed: 1 },
  { name: "Motorola Moto E13",           brand: "Motorola", priceGBP: 79,  os: "Android 13", ram: "2GB",  storage: "64GB",  screenSize: '6.5"',  cameraMp: "13MP",  battery: "5000mAh", network: "4G", color: "Cosmic Black", storages: [{ label: "64GB", priceMult: 1 }, { label: "128GB", priceMult: 1.25 }], colours: ["Cosmic Black", "Aurora Green", "Creamy White"], imgSeed: 3 },
  { name: "Nokia C32",                   brand: "Nokia",    priceGBP: 89,  os: "Android 12", ram: "4GB",  storage: "64GB",  screenSize: '6.52"', cameraMp: "16MP",  battery: "5000mAh", network: "4G", color: "Charcoal",    storages: [{ label: "64GB", priceMult: 1 }, { label: "128GB", priceMult: 1.2 }], colours: ["Charcoal", "Autumn Leaf", "Beige"], imgSeed: 5 },
  { name: "Realme Narzo N53",            brand: "Realme",   priceGBP: 99,  os: "Android 13", ram: "6GB",  storage: "128GB", screenSize: '6.74"', cameraMp: "50MP",  battery: "5000mAh", network: "4G", color: "Feather Gold", storages: [{ label: "128GB", priceMult: 1 }], colours: ["Feather Gold", "Feather Black"], imgSeed: 7 },
];

const FIVE_G_PHONES: MobileDef[] = [
  { name: "OnePlus 12R 5G 256GB",        brand: "OnePlus",  priceGBP: 549, os: "Android 14", ram: "16GB", storage: "256GB", screenSize: '6.78"', cameraMp: "50MP",  battery: "5500mAh", network: "5G", color: "Iron Gray",   storages: [{ label: "128GB", priceMult: 0.88 }, { label: "256GB", priceMult: 1 }], colours: ["Iron Gray", "Cool Blue"], imgSeed: 0 },
  { name: "Samsung Galaxy S23 FE 5G",    brand: "Samsung",  priceGBP: 499, os: "Android 14", ram: "8GB",  storage: "128GB", screenSize: '6.4"',  cameraMp: "50MP",  battery: "4500mAh", network: "5G", color: "Graphite",    storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.2 }], colours: ["Graphite", "Cream", "Lavender", "Mint"], imgSeed: 2 },
  { name: "Xiaomi 13T Pro 5G",           brand: "Xiaomi",   priceGBP: 699, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '6.67"', cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Black",       storages: [{ label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.25 }], colours: ["Black", "Alpine Blue", "Meadow Green"], imgSeed: 4 },
  { name: "Google Pixel 8 5G",           brand: "Google",   priceGBP: 699, os: "Android 14", ram: "8GB",  storage: "128GB", screenSize: '6.2"',  cameraMp: "50MP",  battery: "4575mAh", network: "5G", color: "Hazel",       storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.14 }], colours: ["Hazel", "Obsidian", "Rose"], imgSeed: 6 },
  { name: "Vivo X90 Pro+ 5G",            brand: "Vivo",     priceGBP: 899, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '6.78"', cameraMp: "50MP",  battery: "4700mAh", network: "5G", color: "Urban Black", storages: [{ label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.28 }], colours: ["Urban Black", "Vintage Red"], imgSeed: 8 },
  { name: "OPPO Find X7 5G",             brand: "OPPO",     priceGBP: 749, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '6.74"', cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Ocean Blue",  storages: [{ label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.3 }], colours: ["Ocean Blue", "Moonlight Purple"], imgSeed: 10 },
  { name: "Samsung Galaxy A55 5G",       brand: "Samsung",  priceGBP: 379, os: "Android 14", ram: "8GB",  storage: "128GB", screenSize: '6.6"',  cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Awesome Lilac", storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.18 }], colours: ["Awesome Lilac", "Awesome Iceblue", "Awesome Navy"], imgSeed: 1 },
  { name: "Motorola Edge 50 Fusion 5G",  brand: "Motorola", priceGBP: 299, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '6.67"', cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Forest Blue", storages: [{ label: "256GB", priceMult: 1 }], colours: ["Forest Blue", "Hot Pink", "Marshmallow Blue"], imgSeed: 3 },
  { name: "OnePlus Nord 3 5G",           brand: "OnePlus",  priceGBP: 399, os: "Android 13", ram: "8GB",  storage: "128GB", screenSize: '6.74"', cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Tempest Gray", storages: [{ label: "128GB", priceMult: 1 }, { label: "256GB", priceMult: 1.17 }], colours: ["Tempest Gray", "Misty Green"], imgSeed: 5 },
  { name: "Realme GT 5 Pro 5G",          brand: "Realme",   priceGBP: 499, os: "Android 14", ram: "16GB", storage: "512GB", screenSize: '6.78"', cameraMp: "50MP",  battery: "5400mAh", network: "5G", color: "Space Black", storages: [{ label: "256GB", priceMult: 0.85 }, { label: "512GB", priceMult: 1 }], colours: ["Space Black", "Navigator Beige"], imgSeed: 7 },
];

const FLAGSHIP_PHONES: MobileDef[] = [
  { name: "Samsung Galaxy S24 Ultra",    brand: "Samsung",  priceGBP: 1299, origGBP: 1349, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '6.8"',  cameraMp: "200MP", battery: "5000mAh", network: "5G", color: "Titanium Black",  storages: [{ label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.24 }, { label: "1TB", priceMult: 1.54 }], colours: ["Titanium Black", "Titanium Gray", "Titanium Violet", "Titanium Yellow"], imgSeed: 0 },
  { name: "Apple iPhone 15 Pro Max 1TB", brand: "Apple",    priceGBP: 1599, os: "iOS 17",    ram: "8GB",  storage: "1TB",   screenSize: '6.7"',  cameraMp: "48MP",  battery: "4422mAh", network: "5G", color: "Black Titanium",  storages: [{ label: "512GB", priceMult: 0.88 }, { label: "1TB", priceMult: 1 }], colours: ["Black Titanium", "Natural Titanium", "White Titanium", "Blue Titanium"], imgSeed: 2 },
  { name: "OnePlus 12 5G 512GB",         brand: "OnePlus",  priceGBP: 849, os: "Android 14", ram: "16GB", storage: "512GB", screenSize: '6.82"', cameraMp: "50MP",  battery: "5400mAh", network: "5G", color: "Silky Black",     storages: [{ label: "256GB", priceMult: 0.88 }, { label: "512GB", priceMult: 1 }], colours: ["Silky Black", "Flowy Emerald"], imgSeed: 4 },
  { name: "Google Pixel 9 Pro 256GB",    brand: "Google",   priceGBP: 999, os: "Android 15", ram: "16GB", storage: "256GB", screenSize: '6.3"',  cameraMp: "50MP",  battery: "4700mAh", network: "5G", color: "Obsidian",        storages: [{ label: "128GB", priceMult: 0.85 }, { label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.28 }, { label: "1TB", priceMult: 1.57 }], colours: ["Obsidian", "Hazel", "Porcelain", "Rose Quartz"], imgSeed: 6 },
  { name: "Samsung Galaxy Z Fold 6",     brand: "Samsung",  priceGBP: 1799, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '7.6"', cameraMp: "50MP",  battery: "4400mAh", network: "5G", color: "Shadow",          storages: [{ label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.22 }, { label: "1TB", priceMult: 1.5 }], colours: ["Shadow", "Silver Shadow", "Pink"], imgSeed: 8 },
  { name: "Samsung Galaxy Z Flip 6",     brand: "Samsung",  priceGBP: 1099, os: "Android 14", ram: "12GB", storage: "256GB", screenSize: '6.7"', cameraMp: "50MP",  battery: "4000mAh", network: "5G", color: "Yellow",          storages: [{ label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.18 }], colours: ["Yellow", "Blue", "Mint", "Silver Shadow", "Crafted Black"], imgSeed: 10 },
  { name: "Xiaomi 14 Ultra 5G",          brand: "Xiaomi",   priceGBP: 1199, os: "Android 14", ram: "16GB", storage: "512GB", screenSize: '6.73"', cameraMp: "50MP", battery: "5000mAh", network: "5G", color: "Black",           storages: [{ label: "256GB", priceMult: 0.88 }, { label: "512GB", priceMult: 1 }], colours: ["Black", "White"], imgSeed: 1 },
  { name: "OPPO Find X7 Ultra 5G",       brand: "OPPO",     priceGBP: 999, os: "Android 14", ram: "16GB", storage: "256GB", screenSize: '6.82"', cameraMp: "50MP",  battery: "5000mAh", network: "5G", color: "Ocean Blue",      storages: [{ label: "256GB", priceMult: 1 }, { label: "512GB", priceMult: 1.3 }], colours: ["Ocean Blue", "Desert Silver"], imgSeed: 3 },
  { name: "Vivo X100 Pro+ 5G",           brand: "Vivo",     priceGBP: 1099, os: "Android 14", ram: "16GB", storage: "512GB", screenSize: '6.78"', cameraMp: "50MP", battery: "5400mAh", network: "5G", color: "Titanium Gray",   storages: [{ label: "512GB", priceMult: 1 }], colours: ["Titanium Gray", "Starry Night Black"], imgSeed: 5 },
  { name: "Google Pixel 9 Pro XL 512GB", brand: "Google",   priceGBP: 1199, os: "Android 15", ram: "16GB", storage: "512GB", screenSize: '6.8"',  cameraMp: "50MP", battery: "5060mAh", network: "5G", color: "Obsidian",        storages: [{ label: "256GB", priceMult: 0.88 }, { label: "512GB", priceMult: 1 }, { label: "1TB", priceMult: 1.25 }], colours: ["Obsidian", "Hazel", "Porcelain", "Rose Quartz"], imgSeed: 7 },
];

// ─── L2 → product list mapping ────────────────────────────────────────────────

const L2_PRODUCTS: Array<{ l2Name: string; products: MobileDef[] }> = [
  { l2Name: "Android Phones",    products: ANDROID_PHONES   },
  { l2Name: "iPhone & Apple",    products: IPHONE_APPLE     },
  { l2Name: "Budget Smartphones",products: BUDGET_SMARTPHONES },
  { l2Name: "5G Smartphones",    products: FIVE_G_PHONES    },
  { l2Name: "Flagship Phones",   products: FLAGSHIP_PHONES  },
];

// ─── CategoryAttributes for Electronics & Gaming ─────────────────────────────

const ELECTRONICS_ATTRS = {
  category: "mobiles",
  label:    "Mobiles",
  isActive: true,
  attributes: [
    {
      key:        "brand",
      label:      "Brand",
      type:       "select",
      filterable: true,
      searchable: true,
      required:   false,
      options:    ["Samsung", "Apple", "Google", "OnePlus", "Xiaomi", "Motorola", "Nokia", "Realme", "OPPO", "Vivo", "Sony", "LG", "Philips", "JBL", "Bose", "Anker", "Logitech", "Microsoft", "Razer"],
      order:      1,
    },
    {
      key:        "os",
      label:      "Operating System",
      type:       "select",
      filterable: true,
      searchable: false,
      required:   false,
      options:    ["Android 15", "Android 14", "Android 13", "Android 12", "iOS 17", "iOS 16", "Windows 11", "Windows 10", "macOS Sonoma", "ChromeOS"],
      order:      2,
    },
    {
      key:        "ram",
      label:      "RAM",
      type:       "select",
      filterable: true,
      searchable: false,
      required:   false,
      options:    ["2GB", "4GB", "6GB", "8GB", "12GB", "16GB", "32GB", "64GB"],
      order:      3,
    },
    {
      key:        "storage",
      label:      "Storage",
      type:       "select",
      filterable: true,
      searchable: false,
      required:   false,
      options:    ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"],
      order:      4,
    },
    {
      key:        "network",
      label:      "Network",
      type:       "select",
      filterable: true,
      searchable: false,
      required:   false,
      options:    ["4G", "5G", "Wi-Fi Only"],
      order:      5,
    },
    {
      key:        "screen_size",
      label:      "Screen Size",
      type:       "select",
      filterable: true,
      searchable: false,
      required:   false,
      options:    ['Under 6"', '6" – 6.5"', '6.5" – 7"', 'Above 7"'],
      order:      6,
    },
    {
      key:        "camera_mp",
      label:      "Main Camera",
      type:       "select",
      filterable: true,
      searchable: false,
      required:   false,
      options:    ["12MP", "13MP", "16MP", "48MP", "50MP", "64MP", "108MP", "200MP+"],
      order:      7,
    },
    {
      key:        "battery",
      label:      "Battery Capacity",
      type:       "select",
      filterable: true,
      searchable: false,
      required:   false,
      options:    ["Under 3000mAh", "3000 – 4000mAh", "4000 – 5000mAh", "5000mAh+"],
      order:      8,
    },
    {
      key:        "processor",
      label:      "Processor",
      type:       "select",
      filterable: true,
      searchable: false,
      required:   false,
      options:    ["Apple A16 Bionic", "Apple A17 Pro", "Snapdragon 8 Gen 3", "Snapdragon 7s Gen 2", "Snapdragon 695 5G", "MediaTek Dimensity 9300", "MediaTek Dimensity 6020", "Google Tensor G3", "Intel Core i5", "Intel Core i7", "AMD Ryzen 5"],
      order:      9,
    },
    {
      key:        "color",
      label:      "Colour",
      type:       "multiselect",
      filterable: true,
      searchable: false,
      required:   false,
      options:    ["Black", "White", "Blue", "Green", "Purple", "Silver", "Gold", "Titanium", "Pink", "Yellow", "Red"],
      order:      10,
    },
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<username>")) {
    console.error("❌  MONGODB_URI not configured in .env.local");
    process.exit(1);
  }

  console.log("\n🔌  Connecting to MongoDB...");
  await connectDB();
  console.log("✅  Connected\n");

  // ── Step 1: Find Electronics & Gaming L0 ────────────────────────────────────
  console.log("🔍  Step 1/5 — Finding Electronics & Gaming L0 category...");
  const l0 = await CategoryModel.findOne({ slug: "electronics-gaming", level: 0 }).lean();
  if (!l0) {
    console.error("❌  'electronics-gaming' L0 category not found. Run seed:full first.");
    process.exit(1);
  }
  console.log(`   Found: ${l0.name} (_id: ${l0._id})`);

  // ── Step 2: Insert / replace Mobiles L1 ──────────────────────────────────────
  console.log("\n📂  Step 2/5 — Inserting Mobiles L1 and L2 categories...");

  // Remove stale "Mobiles" L1 and its children for idempotency
  const oldL1 = await CategoryModel.findOne({ slug: "mobiles", level: 1 }).lean();
  if (oldL1) {
    await CategoryModel.deleteMany({ parentId: oldL1._id });
    await CategoryModel.deleteOne({ _id: oldL1._id });
    console.log("   Removed stale Mobiles L1 + children");
  }

  const mobilesL1 = await CategoryModel.create({
    name:         "Mobiles",
    slug:         "mobiles",
    emoji:        "📱",
    description:  "Smartphones, iPhones, budget phones, 5G handsets and flagship devices",
    image:        "",
    color:        "bg-blue-50",
    textColor:    "text-blue-700",
    level:        1,
    parentId:     l0._id,
    order:        6,
    isActive:     true,
    productCount: 0,
  });
  console.log(`   Created L1: Mobiles (_id: ${mobilesL1._id})`);

  const L2_DEFS = [
    { name: "Android Phones",     slug: "android-phones",     emoji: "🤖", order: 1 },
    { name: "iPhone & Apple",     slug: "iphone-apple",       emoji: "🍎", order: 2 },
    { name: "Budget Smartphones", slug: "budget-smartphones",  emoji: "💰", order: 3 },
    { name: "5G Smartphones",     slug: "5g-smartphones",      emoji: "⚡", order: 4 },
    { name: "Flagship Phones",    slug: "flagship-phones",     emoji: "🏆", order: 5 },
  ];

  const l2Docs = await CategoryModel.insertMany(
    L2_DEFS.map((d) => ({
      ...d,
      description:  `Browse ${d.name} from top brands`,
      image:        "",
      color:        "bg-blue-50",
      textColor:    "text-blue-700",
      level:        2,
      parentId:     mobilesL1._id,
      isActive:     true,
      productCount: 0,
    }))
  );
  console.log(`   Created ${l2Docs.length} L2 categories under Mobiles`);

  // ── Step 3: Upsert CategoryAttributes for electronics & gaming ───────────────
  console.log("\n🏷️   Step 3/5 — Upserting CategoryAttributes for Electronics & Gaming...");
  await CategoryAttributesModel.findOneAndUpdate(
    { category: ELECTRONICS_ATTRS.category },
    { $set: ELECTRONICS_ATTRS },
    { upsert: true, new: true }
  );
  console.log("   ✅  CategoryAttributes upserted for 'mobiles' (10 filterable attributes)");

  // ── Step 4: Delete stale mobile products & insert 50 new products ───────────
  console.log("\n📦  Step 4/5 — Generating 50 mobile products...");

  const mobileL2Names = L2_PRODUCTS.map((x) => x.l2Name);
  const deleted = await ProductModel.deleteMany({ subcategory: { $in: mobileL2Names } });
  if (deleted.deletedCount) console.log(`   Removed ${deleted.deletedCount} stale mobile products`);

  const techVendorId   = new mongoose.Types.ObjectId(VENDOR_IDS.TECH_ZONE);
  const techVendorName = VENDOR_NAMES.TECH_ZONE;

  const BADGES = ["NEW", "HOT", "EXCLUSIVE", null, null, null, null] as const;

  let totalInserted = 0;

  for (const { l2Name, products } of L2_PRODUCTS) {
    const docs = products.map((p, idx) => {
      const badge = BADGES[idx % BADGES.length];
      const imgCount = 3 + (idx % 2); // 3 or 4 images
      const images = pickImages(p.imgSeed, imgCount);

      const batteryNorm =
        parseInt(p.battery) >= 5000 ? "5000mAh+" :
        parseInt(p.battery) >= 4000 ? "4000 – 5000mAh" :
        parseInt(p.battery) >= 3000 ? "3000 – 4000mAh" : "Under 3000mAh";

      const screenNorm =
        parseFloat(p.screenSize) < 6   ? 'Under 6"' :
        parseFloat(p.screenSize) <= 6.5 ? '6" – 6.5"' :
        parseFloat(p.screenSize) <= 7   ? '6.5" – 7"' : 'Above 7"';

      const hasDiscount = !!p.origGBP || Math.random() < 0.3;
      const origGBP     = p.origGBP ?? (hasDiscount ? p.priceGBP * (1 + Math.random() * 0.2 + 0.08) : null);

      return {
        name:              p.name,
        slug:              `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${8000 + totalInserted + idx + 1}`,
        description:       `${p.name} — a high-performance smartphone from ${p.brand}. Features ${p.ram} RAM, ${p.storage} storage, a ${p.cameraMp} main camera, ${p.battery} battery, and blazing-fast ${p.network} connectivity. Available in ${p.color} and more.`,
        price:             toINR(p.priceGBP),
        ...(origGBP ? { originalPrice: toINR(origGBP) } : {}),
        images,
        category:          "Mobiles",
        subcategory:       l2Name,
        brand:             p.brand,
        unit:              "each",
        inStock:           true,
        stockQuantity:     rand(10, 250),
        lowStockThreshold: 5,
        rating:            parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
        reviewCount:       rand(15, 1800),
        tags:              [
          p.brand.toLowerCase(),
          p.network.toLowerCase(),
          "smartphone",
          "mobile",
          p.os.toLowerCase().replace(/\s+/g, "-"),
          l2Name.toLowerCase().replace(/\s+/g, "-"),
        ],
        ...(badge ? { badge } : {}),
        deliveryOptions:   ["standard", "express"],
        vendorId:          techVendorId,
        vendorName:        techVendorName,
        status:            "approved",
        attributes: {
          brand:       p.brand,
          os:          p.os,
          ram:         p.ram,
          storage:     p.storage,
          network:     p.network,
          screen_size: screenNorm,
          camera_mp:   p.cameraMp,
          battery:     batteryNorm,
          color:       p.color,
        },
        variants: makeVariants({
          priceGBP: p.priceGBP,
          storages:  p.storages,
          colours:   p.colours,
        }),
      };
    });

    await ProductModel.insertMany(docs, { ordered: false });
    totalInserted += docs.length;
    console.log(`   ✓ ${l2Name}: ${docs.length} products`);
  }

  // ── Step 5: Update productCount ───────────────────────────────────────────────
  console.log("\n🔢  Step 5/5 — Updating category product counts...");

  for (const { l2Name } of L2_PRODUCTS) {
    const count = await ProductModel.countDocuments({ subcategory: l2Name });
    await CategoryModel.updateOne({ name: l2Name, level: 2 }, { productCount: count });
  }

  const mobileCount = await ProductModel.countDocuments({
    subcategory: { $in: mobileL2Names },
  });
  await CategoryModel.updateOne({ _id: mobilesL1._id }, { productCount: mobileCount });

  // Recalculate L0 Electronics productCount
  const l1Children = await CategoryModel.find({ parentId: l0._id, level: 1 }).select("productCount").lean();
  const l0Total    = l1Children.reduce((s, c) => s + (c.productCount ?? 0), 0);
  await CategoryModel.findByIdAndUpdate(l0._id, { productCount: l0Total });

  console.log(`   Updated productCount for ${L2_DEFS.length} L2 categories + Mobiles L1 + Electronics & Gaming L0`);

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log("\n─────────────────────────────────────────────────────");
  console.log("✅  Mobiles seed complete");
  console.log(`   L1 category  : Mobiles`);
  console.log(`   L2 categories: ${L2_DEFS.length}`);
  console.log(`   Products     : ${totalInserted} (${mobileCount} total mobile products)`);
  console.log(`   CategoryAttrs: mobiles (10 attributes)`);
  console.log("─────────────────────────────────────────────────────\n");

  await mongoose.disconnect();
}

void run().catch((err) => {
  console.error("❌  Mobiles seed failed:", err);
  process.exit(1);
});
