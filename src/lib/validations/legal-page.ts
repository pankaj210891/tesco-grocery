import { z } from "zod";

const ContentBlockSchema = z.object({
  type: z.enum(["paragraph", "bulletList", "numberedList", "subheading", "highlight"]),
  text:  z.string().optional(),
  items: z.array(z.string()).optional(),
});

const LegalSectionSchema = z.object({
  id:     z.string().min(1),
  title:  z.string().min(1),
  order:  z.number().int().min(0),
  blocks: z.array(ContentBlockSchema).default([]),
});

export const CreateLegalPageSchema = z.object({
  slug:          z.enum(["terms", "privacy"]),
  title:         z.string().min(1).max(200),
  introText:     z.string().min(1),
  lastUpdated:   z.string().datetime(),
  effectiveDate: z.string().datetime(),
  version:       z.string().min(1).max(20).default("1.0"),
  isPublished:   z.boolean().default(true),
  sections:      z.array(LegalSectionSchema).default([]),
});

export const UpdateLegalPageSchema = CreateLegalPageSchema.partial();

export type CreateLegalPageInput = z.infer<typeof CreateLegalPageSchema>;
export type UpdateLegalPageInput = z.infer<typeof UpdateLegalPageSchema>;
