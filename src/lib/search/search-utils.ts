/**
 * Reusable search utility functions.
 *
 * Previously escapeRegex was duplicated across suggestions/route.ts,
 * product.service.ts, and dynamic-filters.service.ts. All callers should
 * import from here instead.
 */

/**
 * Escape special regex metacharacters so user input is safe to embed in RegExp.
 */
export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalize a search query: trim, collapse internal whitespace, enforce length.
 * Returns an empty string when the query exceeds maxLen (treated as invalid).
 */
export function normalizeQuery(q: string, maxLen = 120): string {
  const cleaned = q.trim().replace(/\s+/g, " ");
  return cleaned.length > maxLen ? "" : cleaned;
}

/**
 * Build a MongoDB $or regex filter across an explicit set of document fields.
 * The regex is anchor-free — matches anywhere within the field value.
 */
export function buildRegexFilter(
  q: string,
  fields: string[],
): Record<string, unknown> {
  const regex = new RegExp(escapeRegex(q), "i");
  return { $or: fields.map((f) => ({ [f]: regex })) };
}

/**
 * Build a case-insensitive exact-brand RegExp for $in queries.
 * Anchored (^…$) so "Nike" doesn't match "Nike Pro".
 */
export function brandRegex(brand: string): RegExp {
  return new RegExp(`^${escapeRegex(brand)}$`, "i");
}
