/**
 * Shared utilities for all seed generators. No external deps — pure TS.
 *
 * Image helpers use placehold.co so the UI looks styled in development
 * without requiring real uploads. Replace URLs with a real CDN path in prod.
 */

// ─── Category → hex colour map (mirrors Tailwind classes in categories.seed) ─
const CAT_COLOURS: Record<string, string> = {
  "fresh-food":          "22c55e",
  "bakery":              "f59e0b",
  "frozen-food":         "06b6d4",
  "treats-snacks":       "f97316",
  "food-cupboard":       "ca8a04",
  "drinks":              "a855f7",
  "health-beauty":       "d946ef",
  "household":           "6b7280",
  "baby-toddler":        "ec4899",
  "pets":                "84cc16",
  "home-furniture":      "78716c",
  "electronics-gaming":  "3b82f6",
  "clothing-accessories":"f43f5e",
  "toys-games":          "ef4444",
  "sports-leisure":      "6366f1",
  "garden-diy-car":      "16a34a",
  "hobbies-stationery":  "10b981",
  "parties-seasonal":    "14b8a6",
  "marketplace":         "7c3aed",
  "kiosk":               "0ea5e9",
  "inspiration-events":  "eab308",
};

/**
 * Return an array of 3 placehold.co image URLs for a given product.
 * @param name     Short product label shown on the placeholder card
 * @param category Category slug — determines the card background colour
 */
export function productImages(name: string, category: string): string[] {
  const colour = CAT_COLOURS[category] ?? "0F4C75";
  const label  = encodeURIComponent(name.slice(0, 22));
  return [
    `https://placehold.co/600x400/${colour}/FFFFFF.png?text=${label}`,
    `https://placehold.co/400x400/${colour}/FFFFFF.png?text=${label}`,
    `https://placehold.co/400x300/${colour}/FFFFFF.png?text=${label}`,
  ];
}

/** Return a random element from an array. */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Return n distinct random elements (no repeats). Falls back to the full arr if n >= arr.length. */
export function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

/** Inclusive random integer between min and max. */
export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random float rounded to `decimals` places. */
export function randFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/** Returns true with `pct` probability (0–1). */
export function chance(pct: number): boolean {
  return Math.random() < pct;
}

/** Return a shuffled copy of an array. */
export function shuffled<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Convert a display name to a URL-safe slug (mirrors lib/utils/format slugify). */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Clamp a number to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Generate a unique order number: PS-YYYYMMDD-XXXXXX */
export function genOrderNumber(): string {
  const d   = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const uid = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PS-${day}-${uid}`;
}

/** ISO date string offset by `daysAgo` days from now. */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/** ISO date string `daysAhead` days in the future. */
export function daysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
