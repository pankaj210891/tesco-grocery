import { z } from "zod";
import { ATTRIBUTE_TYPES } from "@/lib/db/models/category-attributes.model";

export const AttributeDefSchema = z.object({
  key:        z.string().min(1).max(50).regex(/^[a-z0-9_]+$/, "Key must be lowercase alphanumeric + underscores"),
  label:      z.string().min(1).max(100),
  type:       z.enum(ATTRIBUTE_TYPES),
  filterable: z.boolean().default(true),
  searchable: z.boolean().default(false),
  required:   z.boolean().default(false),
  options:    z.array(z.string().min(1).max(100)).default([]),
  order:      z.number().int().min(0).default(0),
});

export const CreateCategoryAttributesSchema = z.object({
  category:   z.string().min(1).max(100).toLowerCase().trim(),
  label:      z.string().min(1).max(100).trim(),
  attributes: z.array(AttributeDefSchema).default([]),
  isActive:   z.boolean().default(true),
});

export const UpdateCategoryAttributesSchema = z.object({
  label:      z.string().min(1).max(100).trim().optional(),
  attributes: z.array(AttributeDefSchema).optional(),
  isActive:   z.boolean().optional(),
});

export type CreateCategoryAttributesInput = z.infer<typeof CreateCategoryAttributesSchema>;
export type UpdateCategoryAttributesInput = z.infer<typeof UpdateCategoryAttributesSchema>;
export type AttributeDefInput            = z.infer<typeof AttributeDefSchema>;
