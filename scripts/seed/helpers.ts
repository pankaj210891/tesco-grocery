/**
 * Shared utilities for the full seed pipeline.
 * Handles price conversion, slug generation, SKU generation,
 * variant generation, badges, tags, and descriptions.
 */

import { rand, randFloat, chance, pick } from "../../src/lib/data/seeds/utils";

// ─── Price ────────────────────────────────────────────────────────────────────

const GBP_TO_INR = 106;
export const toINR = (gbp: number) => Math.round(gbp * GBP_TO_INR);

// ─── Slug & SKU ───────────────────────────────────────────────────────────────

export function toSlug(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/[\s-]+/g, "-");
}

export function genSku(counter: { n: number }, prefix = "PROD"): string {
  counter.n++;
  return `${prefix}-${String(counter.n).padStart(6, "0")}`;
}

// ─── Variant generation ───────────────────────────────────────────────────────

export type VariantStrategy = "none" | "weight" | "volume" | "flavor" | "color" | "size" | "storage";

const WEIGHT_OPTS: Array<[string, number]> = [
  ["250g", 0.55], ["500g", 1.0], ["1kg", 1.75], ["2kg", 3.2], ["5kg", 7.0],
];
const VOLUME_OPTS: Array<[string, number]> = [
  ["200ml", 0.5], ["400ml", 1.0], ["500ml", 1.2], ["750ml", 1.65], ["1L", 2.1], ["2L", 3.8],
];
const FLAVOR_OPTS = [
  "Original", "Cheese & Onion", "Salt & Vinegar", "Sour Cream & Chive",
  "BBQ", "Sweet Chilli", "Prawn Cocktail", "Pickled Onion", "Smoky Bacon",
];
const COLOR_OPTS = ["Black", "White", "Navy Blue", "Charcoal", "Burgundy", "Forest Green", "Blush Pink"];
const SIZE_OPTS   = ["XS", "S", "M", "L", "XL", "XXL"];
const STORAGE_OPTS: Array<[string, number]> = [
  ["64GB / Midnight Black", 1.0], ["128GB / Midnight Black", 1.25], ["128GB / Pearl White", 1.25],
  ["256GB / Midnight Black", 1.55], ["256GB / Silver", 1.55], ["512GB / Midnight Black", 1.9],
];

export interface VariantDoc {
  label: string; sku: string;
  price: number | null; originalPrice: number | null;
  stockQuantity: number | null; inStock: boolean;
}

export function generateVariants(
  strategy: VariantStrategy,
  basePriceGBP: number,
  counter: { n: number },
): VariantDoc[] {
  if (strategy === "none") return [];
  if (chance(0.32)) return [];

  const mk = () => genSku(counter, "VAR");

  switch (strategy) {
    case "weight": {
      const n = pick([2, 2, 3, 3, 4]);
      return WEIGHT_OPTS.slice(0, n).map(([label, mult]) => ({
        label, sku: mk(),
        price: toINR(basePriceGBP * mult),
        originalPrice: chance(0.35) ? toINR(basePriceGBP * mult * 1.18) : null,
        stockQuantity: rand(20, 350), inStock: true,
      }));
    }
    case "volume": {
      const n = pick([2, 2, 3, 3, 4]);
      return VOLUME_OPTS.slice(0, n).map(([label, mult]) => ({
        label, sku: mk(),
        price: toINR(basePriceGBP * mult),
        originalPrice: chance(0.35) ? toINR(basePriceGBP * mult * 1.15) : null,
        stockQuantity: rand(20, 300), inStock: true,
      }));
    }
    case "flavor": {
      const n = pick([2, 3, 3, 4, 5]);
      return FLAVOR_OPTS.slice(0, n).map((label) => ({
        label, sku: mk(), price: toINR(basePriceGBP), originalPrice: null,
        stockQuantity: rand(50, 600), inStock: true,
      }));
    }
    case "color": {
      const n = pick([2, 3, 3, 4]);
      return COLOR_OPTS.slice(0, n).map((label) => ({
        label, sku: mk(), price: toINR(basePriceGBP),
        originalPrice: chance(0.2) ? toINR(basePriceGBP * 1.1) : null,
        stockQuantity: rand(10, 120), inStock: true,
      }));
    }
    case "size": {
      const n = pick([3, 4, 5, 6]);
      return SIZE_OPTS.slice(0, n).map((label) => ({
        label, sku: mk(), price: toINR(basePriceGBP), originalPrice: null,
        stockQuantity: rand(10, 150), inStock: true,
      }));
    }
    case "storage": {
      const n = pick([2, 2, 3, 4]);
      return STORAGE_OPTS.slice(0, n).map(([label, mult]) => ({
        label, sku: mk(),
        price: toINR(basePriceGBP * mult),
        originalPrice: chance(0.3) ? toINR(basePriceGBP * mult * 1.1) : null,
        stockQuantity: rand(5, 60), inStock: true,
      }));
    }
    default: return [];
  }
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type Badge = "NEW" | "HOT" | "LIMITED" | "ORGANIC" | "EXCLUSIVE";
export function randomBadge(organicBoost = false): Badge | null {
  const r = Math.random();
  if (organicBoost && r < 0.12) return "ORGANIC";
  if (r < 0.07)  return "NEW";
  if (r < 0.14)  return "HOT";
  if (r < 0.17)  return "LIMITED";
  if (r < 0.19)  return "EXCLUSIVE";
  return null;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export function makeTags(name: string, l2: string, extras: string[] = []): string[] {
  const raw = [name, l2, ...extras].join(" ").toLowerCase().split(/[\s&,\-]+/);
  return Array.from(new Set(raw.map((w) => w.replace(/[^a-z0-9]/g, "")).filter((w) => w.length > 2))).slice(0, 6);
}

// ─── Descriptions ─────────────────────────────────────────────────────────────

const DESC_POOL: Array<(p: string, b: string, c: string) => string> = [
  (p, b, c) => `${p} from ${b} — crafted with care for outstanding quality. A must-have ${c.toLowerCase()} for everyday life.`,
  (p, b, c) => `Premium ${c.toLowerCase()} by ${b}. ${p} delivers the quality you expect at a price that makes sense.`,
  (p, b, c) => `${b} presents ${p}, a standout choice in the ${c.toLowerCase()} category. Trusted by thousands of happy customers.`,
  (p, b, c) => `Discover ${p} by ${b}. Carefully selected and quality-assured — exactly what you need from a great ${c.toLowerCase()}.`,
  (p, b, c) => `${p} by ${b}: reliable, high-quality ${c.toLowerCase()} that consistently exceeds expectations. A household favourite.`,
  (p, b, c) => `${b}'s ${p} is the smart choice for ${c.toLowerCase()} lovers who refuse to compromise on quality or value.`,
];

export function makeDescription(productName: string, brand: string, l2Name: string, idx: number): string {
  return DESC_POOL[idx % DESC_POOL.length](productName, brand, l2Name);
}

export { rand, randFloat, chance, pick };
