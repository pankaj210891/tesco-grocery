import { z } from "zod";

export const ProductFiltersSchema = z
  .object({
    category:    z.string().min(1).optional(),
    subcategory: z.string().min(1).optional(),
    brand:       z.string().optional(),         // comma-separated multi-select
    q:           z.string().optional(),
    minPrice:    z.coerce.number().min(0).optional(),
    maxPrice:    z.coerce.number().min(0).optional(),
    inStock:     z.enum(["true", "false"]).optional(),
    rating:      z.coerce.number().int().min(1).max(5).optional(),
    discount:    z.coerce.number().int().min(1).max(100).optional(),
    delivery:    z.string().optional(),         // comma-separated multi-select
    sortBy:      z.enum(["price-asc", "price-desc", "rating", "newest", "popularity"]).optional(),
    page:        z.coerce.number().int().min(1).optional(),
    limit:       z.coerce.number().int().min(1).max(100).optional(),
    slugs:       z.string().optional(),
    // Dynamic attribute filters passed as attr[key]=value1,value2
    // We capture the raw attrs JSON string from URL and parse it downstream
    attrs:       z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Price filter is only valid when BOTH bounds are provided
    const hasMin = data.minPrice !== undefined;
    const hasMax = data.maxPrice !== undefined;
    if (hasMin && !hasMax) {
      ctx.addIssue({
        code:    "custom",
        path:    ["maxPrice"],
        message: "maxPrice is required when minPrice is provided",
      });
    }
    if (hasMax && !hasMin) {
      ctx.addIssue({
        code:    "custom",
        path:    ["minPrice"],
        message: "minPrice is required when maxPrice is provided",
      });
    }
    if (hasMin && hasMax && data.minPrice! > data.maxPrice!) {
      ctx.addIssue({
        code:    "custom",
        path:    ["maxPrice"],
        message: "maxPrice must be greater than or equal to minPrice",
      });
    }
  });

export type ParsedProductFiltersInput = z.input<typeof ProductFiltersSchema>;
export type ParsedProductFilters      = z.infer<typeof ProductFiltersSchema>;
