/**
 * Centralised cache key registry.
 *
 * All keys are prefixed with the app namespace "ps" (Prakash Supermarket) to
 * prevent collisions with the existing rate-limit ("@rl") and token-revocation
 * ("revoked:jti:") key-spaces that live on the same Upstash instance.
 *
 * Key format: ps:<domain>:<discriminator>
 */

// ── TTL strategy ─────────────────────────────────────────────────────────────

export const TTL = {
  /** 1 minute — dynamic data whose staleness is immediately visible (dynamic filters). */
  SHORT:     60,
  /** 5 minutes — semi-static data updated by admin actions (homepage sections, recommendations). */
  MEDIUM:    300,
  /** 1 hour — mostly-static reference data (categories, commission config, category attributes). */
  LONG:      3_600,
  /** 24 hours — near-immutable data that rarely changes. */
  VERY_LONG: 86_400,
} as const;

export type TTLValue = (typeof TTL)[keyof typeof TTL];

// ── Namespace prefix ──────────────────────────────────────────────────────────

const NS = "ps";

// ── Per-domain key builders ───────────────────────────────────────────────────

export const CacheKey = {
  // Commission
  commissionConfig:    ()              => `${NS}:commission:config`,

  // Categories
  categoryList:        ()              => `${NS}:category:list`,
  categoryTree:        ()              => `${NS}:category:tree`,
  categorySlug:        (slug: string)  => `${NS}:category:slug:${slug}`,

  // Category attributes (keyed by category slug)
  categoryAttrs:       (cat: string)   => `${NS}:cat-attrs:${cat}`,

  // Homepage
  homepageSections:    ()              => `${NS}:homepage:sections`,

  // Dynamic filters (base-case only: category slug, no active filters)
  dynamicFilters:      (cat: string)   => `${NS}:dyn-filters:${cat}`,

  // Cart recommendations (keyed by sorted category list)
  recommendations:     (catKey: string) => `${NS}:recs:cats:${catKey}`,
} as const;

// ── Invalidation group helpers ────────────────────────────────────────────────

/**
 * All keys that must be invalidated whenever ANY category is mutated.
 * Slug-specific keys must be added separately using `CacheKey.categorySlug`.
 */
export const CATEGORY_GROUP_KEYS = [
  CacheKey.categoryList(),
  CacheKey.categoryTree(),
] as const;
