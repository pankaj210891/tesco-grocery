import { z } from "zod";

// Treat empty strings the same as undefined for optional enum params
function emptyToUndefined<T>(v: T | "" | null | undefined): T | undefined {
  return v === "" || v === null || v === undefined ? undefined : v as T;
}

const ISO_DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");

export const AdminProductQuerySchema = z.object({
  page:        z.coerce.number().int().min(1).default(1),
  limit:       z.coerce.number().int().min(1).max(50).default(20),
  search:      z.string().optional(),
  category:    z.string().optional(),
  subcategory: z.string().optional(),
  brand:       z.string().optional(),
  vendorId:    z.string().optional(),
  status:      z.preprocess(emptyToUndefined, z.enum(["pending", "approved", "rejected"]).optional()),
  badge:       z.preprocess(emptyToUndefined, z.enum(["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE"]).optional()),
  inStock:     z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
  minPrice:    z.coerce.number().min(0).optional(),
  maxPrice:    z.coerce.number().min(0).optional(),
  rating:      z.coerce.number().min(0).max(5).optional(),
  discount:    z.coerce.number().min(0).max(100).optional(),
  dateFrom:    ISO_DATE.optional(),
  dateTo:      ISO_DATE.optional(),
  sortBy:      z.preprocess(
    (v) => (!v || v === "" ? "newest" : v),
    z.enum(["newest", "oldest", "price-asc", "price-desc", "rating", "name-asc"]).default("newest"),
  ),
});

export type AdminProductQuery = z.infer<typeof AdminProductQuerySchema>;

export const AdminUserQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
  search:   z.string().optional(),
  role:     z.preprocess(emptyToUndefined, z.enum(["customer", "vendor", "admin"]).optional()),
  status:   z.preprocess(emptyToUndefined, z.enum(["active", "suspended"]).optional()),
  dateFrom: ISO_DATE.optional(),
  dateTo:   ISO_DATE.optional(),
  sortBy:   z.preprocess(
    (v) => (!v || v === "" ? "newest" : v),
    z.enum(["newest", "oldest", "name-asc", "name-desc"]).default("newest"),
  ),
});

export type AdminUserQuery = z.infer<typeof AdminUserQuerySchema>;

export const AdminOrderQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
  status:   z.preprocess(
    (v) => (!v || v === "all" || v === "" ? undefined : v),
    z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]).optional(),
  ),
  q:        z.string().optional(),
  vendorId: z.string().optional(),
  dateFrom: ISO_DATE.optional(),
  dateTo:   ISO_DATE.optional(),
});

export type AdminOrderQuery = z.infer<typeof AdminOrderQuerySchema>;

// ─── Product create / update ──────────────────────────────────────────────────

const BADGE_VALUES = ["NEW", "HOT", "LIMITED", "ORGANIC", "EXCLUSIVE"] as const;
const DELIVERY_VALUES = ["express", "standard", "collection"] as const;

export const AdminVariantSchema = z.object({
  label:         z.string().min(1, "Variant label is required").max(100),
  sku:           z.string().max(100).optional().default(""),
  price:         z.number().min(0).nullable().optional(),
  originalPrice: z.number().min(0).nullable().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
  inStock:       z.boolean().optional().default(true),
});

export type AdminVariant = z.infer<typeof AdminVariantSchema>;

export const AdminProductCreateSchema = z.object({
  name:          z.string().min(1, "Name is required").max(200),
  slug:          z.string().min(1, "Slug is required").max(200).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  description:   z.string().min(1, "Description is required"),
  price:         z.number().min(0),
  originalPrice: z.number().min(0).nullable().optional(),
  images:        z.array(z.string().url("Each image must be a valid URL")).optional().default([]),
  category:      z.string().min(1, "Category is required"),
  subcategory:   z.string().optional().nullable(),
  brand:         z.string().min(1, "Brand is required"),
  unit:          z.string().min(1, "Unit is required"),
  inStock:       z.boolean().optional().default(true),
  tags:          z.array(z.string()).optional().default([]),
  badge:         z.enum(BADGE_VALUES).nullable().optional(),
  deliveryOptions: z.array(z.enum(DELIVERY_VALUES)).optional(),
  vendorId:      z.string().nullable().optional(),
  vendorName:    z.string().nullable().optional(),
  // Dynamic category attributes — sanitised on the client, stored as Map in MongoDB
  attributes:    z.record(z.string(), z.string()).optional().default({}),
  // Product variants (size, weight, colour, storage, etc.)
  variants:      z.array(AdminVariantSchema).optional().default([]),
});

export type AdminProductCreate = z.infer<typeof AdminProductCreateSchema>;

export const AdminProductUpdateSchema = AdminProductCreateSchema.partial().extend({
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

// ─── Refund ───────────────────────────────────────────────────────────────────

export const AdminRefundSchema = z.object({
  type:   z.enum(["full", "partial"]),
  reason: z.string().min(1, "Reason is required").max(500),
  items:  z.array(
    z.object({
      productId: z.string(),
      name:      z.string(),
      quantity:  z.number().int().min(1),
      amount:    z.number().min(0),
    }),
  ).optional(),
  amount: z.number().min(0).optional(),
});

export type AdminRefund = z.infer<typeof AdminRefundSchema>;

// ─── Vendor listing ───────────────────────────────────────────────────────────

export const AdminVendorQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  q:        z.string().optional(),
  status:   z.preprocess(emptyToUndefined, z.enum(["pending", "active", "suspended"]).optional()),
  dateFrom: ISO_DATE.optional(),
  dateTo:   ISO_DATE.optional(),
});

export type AdminVendorQuery = z.infer<typeof AdminVendorQuerySchema>;
