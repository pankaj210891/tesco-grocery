import { z } from "zod";

export const addressSchema = z
  .object({
    label: z.enum(["Home", "Office", "Other"]),
    customLabel: z.string().optional(),
    fullName: z.string().min(2, "Full name is required"),
    phone: z
      .string()
      .length(10, "Phone number must be exactly 10 digits")
      .regex(/^\d{10}$/, "Numbers only, no spaces or symbols"),
    line1: z.string().min(5, "Address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(2, "City is required"),
    postcode: z
      .string()
      .min(5, "Enter a valid postcode")
      .max(8)
      .regex(/^[A-Z0-9 ]{5,8}$/i, "Enter a valid postcode"),
    country: z.string().min(1, "Country is required"),
    isDefault: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.label === "Other") {
      if (!data.customLabel || data.customLabel.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Custom label must be at least 2 characters",
          path: ["customLabel"],
        });
      }
    }
  });

export type AddressFormData = z.infer<typeof addressSchema>;
