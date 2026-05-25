import mongoose from "mongoose";

/**
 * Opaque cursor for keyset (seek-method) pagination.
 *
 * Encodes the last-seen document's sort-field value and _id so the next
 * page can be fetched with a bounded inequality query rather than .skip(N),
 * making page retrieval O(1) regardless of position in the dataset.
 *
 * API dual-mode contract:
 *   cursor param present → keyset mode  (no countDocuments, no skip, returns nextCursor + hasMore)
 *   cursor param absent  → offset mode  (unchanged skip/limit behavior, backward compatible)
 */
export interface KeysetCursor {
  /** MongoDB field name to paginate on (e.g. "createdAt", "price", "name") */
  field: string;
  /** Serialised value of the sort field from the last seen document */
  value: string | number | null;
  /** _id of the last seen document — stable tiebreaker when sort field values collide */
  id:    string;
  /** Sort direction matching the query sort: -1 = DESC, 1 = ASC */
  dir:   1 | -1;
}

// ─── Codec ───────────────────────────────────────────────────────────────────

export function encodeCursor(cursor: KeysetCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(raw: string): KeysetCursor | null {
  try {
    const obj = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as unknown;
    if (
      typeof obj !== "object" || obj === null ||
      typeof (obj as Record<string, unknown>).field !== "string" ||
      typeof (obj as Record<string, unknown>).id    !== "string" ||
      ((obj as Record<string, unknown>).dir !== 1 && (obj as Record<string, unknown>).dir !== -1)
    ) return null;
    return obj as KeysetCursor;
  } catch {
    return null;
  }
}

// ─── Filter builder ───────────────────────────────────────────────────────────

/**
 * Build the MongoDB $or filter that fetches documents starting after the cursor.
 *
 * Descending (dir = -1):
 *   { field: { $lt: value } } OR { field: value, _id: { $lt: id } }
 *
 * Ascending (dir = 1):
 *   { field: { $gt: value } } OR { field: value, _id: { $gt: id } }
 *
 * Null-aware: handles nullable sort fields (e.g. stockQuantity ASC).
 * MongoDB sorts null before all numbers in ASC order.
 */
export function buildKeysetFilter(
  cursor: KeysetCursor,
  fieldPath?: string,
): Record<string, unknown> {
  const field    = fieldPath ?? cursor.field;
  const { value, id, dir } = cursor;
  const objectId = new mongoose.Types.ObjectId(id);
  const cmp      = dir === -1 ? "$lt" : "$gt";

  if (value === null) {
    // ASC null-first: after a null cursor include remaining nulls (by _id) + all non-null docs
    return dir === 1
      ? {
          $or: [
            { [field]: null, _id: { $gt: objectId } },
            { [field]: { $ne: null, $exists: true } },
          ],
        }
      // DESC null-last: after a null cursor there is nothing left
      : { [field]: null, _id: { $lt: objectId } };
  }

  // Deserialise ISO date strings so MongoDB date comparisons work correctly
  const parsedValue: string | number | Date =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)
      ? new Date(value)
      : value;

  return {
    $or: [
      { [field]: { [cmp]: parsedValue } },
      { [field]: parsedValue, _id: { [cmp]: objectId } },
    ],
  };
}

/**
 * Safely merge a keyset filter into an existing MongoDB query filter.
 *
 * If both the base filter and the keyset filter contain a top-level $or,
 * they are lifted into a $and to prevent one from overwriting the other.
 * This is critical when the base filter already has a text-search $or.
 */
export function mergeWithKeysetFilter(
  baseFilter: Record<string, unknown>,
  keysetFilter: Record<string, unknown>,
): Record<string, unknown> {
  const keysetHasOr = "$or" in keysetFilter;
  const baseHasOr   = "$or" in baseFilter;

  if (!keysetHasOr) return { ...baseFilter, ...keysetFilter };
  if (!baseHasOr)   return { ...baseFilter, ...keysetFilter };

  // Both have $or — wrap in $and so neither is lost
  const { $or: baseOr, ...baseRest }     = baseFilter;
  const { $or: keysetOr, ...keysetRest } = keysetFilter;
  return {
    ...baseRest,
    ...keysetRest,
    $and: [
      { $or: baseOr     as unknown[] },
      { $or: keysetOr as unknown[] },
    ],
  };
}

// ─── Cursor extraction ────────────────────────────────────────────────────────

/**
 * Extract a KeysetCursor from the last document in a result set.
 * Serialises Date objects to ISO strings for safe JSON round-tripping.
 */
export function cursorFromDoc(
  doc: Record<string, unknown>,
  field: string,
  dir: 1 | -1,
): KeysetCursor {
  const raw = doc[field];
  let value: string | number | null;
  if (raw instanceof Date)                   value = raw.toISOString();
  else if (raw === null || raw === undefined) value = null;
  else if (typeof raw === "number")          value = raw;
  else                                       value = String(raw);

  return { field, value, id: String(doc._id), dir };
}

// ─── High-level query helper ──────────────────────────────────────────────────

export interface KeysetResult<T> {
  docs:       T[];
  nextCursor: string | undefined;
  hasMore:    boolean;
}

/**
 * Run a keyset-paginated Mongoose find() query.
 *
 * Fetches limit + 1 documents to determine hasMore without a separate
 * countDocuments() call. Trims the extra doc and encodes the nextCursor
 * from the last returned document.
 *
 * The sort is derived directly from cursor.field and cursor.dir, with _id
 * appended as a tiebreaker: { [field]: dir, _id: dir }.
 */
export async function findKeyset<T extends Record<string, unknown>>(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  model:       mongoose.Model<any>;
  filter:      Record<string, unknown>;
  cursor:      KeysetCursor;
  limit:       number;
  projection?: Record<string, 0 | 1>;
  fieldPath?:  string;
}): Promise<KeysetResult<T>> {
  const { model, filter, cursor, limit, projection, fieldPath } = opts;
  const field      = fieldPath ?? cursor.field;
  const dir        = cursor.dir;
  const sort       = { [field]: dir, _id: dir } as Record<string, 1 | -1>;

  const keysetFilter = buildKeysetFilter(cursor, fieldPath);
  const merged       = mergeWithKeysetFilter(filter, keysetFilter);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = model.find(merged as any).sort(sort).limit(limit + 1);
  if (projection) q.select(projection);

  const docs    = await q.lean() as T[];
  const hasMore = docs.length > limit;
  const trimmed = hasMore ? docs.slice(0, limit) : docs;
  const last    = trimmed[trimmed.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor(cursorFromDoc(last as Record<string, unknown>, field, dir))
    : undefined;

  return { docs: trimmed, nextCursor, hasMore };
}

// ─── Sort map helpers ─────────────────────────────────────────────────────────

/**
 * Describes how a named sort option maps to a DB sort spec and cursor config.
 * The _id tiebreaker is added automatically in findKeyset.
 */
export interface SortConfig {
  sort:        Record<string, 1 | -1>;
  cursorField: string;
  cursorDir:   1 | -1;
}

export const COMMON_SORT_CONFIGS: Record<string, SortConfig> = {
  newest:       { sort: { createdAt: -1, _id: -1 }, cursorField: "createdAt", cursorDir: -1 },
  oldest:       { sort: { createdAt:  1, _id:  1 }, cursorField: "createdAt", cursorDir:  1 },
  "price-asc":  { sort: { price:  1, _id:  1 },     cursorField: "price",     cursorDir:  1 },
  "price-desc": { sort: { price: -1, _id: -1 },     cursorField: "price",     cursorDir: -1 },
  rating:       { sort: { rating: -1, _id: -1 },    cursorField: "rating",    cursorDir: -1 },
  "name-asc":   { sort: { name:   1, _id:  1 },     cursorField: "name",      cursorDir:  1 },
  "name-desc":  { sort: { name:  -1, _id: -1 },     cursorField: "name",      cursorDir: -1 },
  popularity:   { sort: { reviewCount: -1, _id: -1 }, cursorField: "reviewCount", cursorDir: -1 },
};
