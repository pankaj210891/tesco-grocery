import { z } from "zod";

export const inviteVendorSchema = z.object({
  email:        z.string().email("Enter a valid email address").toLowerCase().trim(),
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(100).trim(),
  contactName:  z.string().min(2, "Contact name must be at least 2 characters").max(80).trim(),
});

export const completeOnboardingSchema = z
  .object({
    token:        z.string().min(1, "Invite token is required"),
    name:         z.string().min(2, "Full name must be at least 2 characters").max(80).trim(),
    businessName: z.string().min(2, "Business name must be at least 2 characters").max(100).trim(),
    slug:         z
      .string()
      .min(2)
      .max(80)
      .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens")
      .trim(),
    description: z.string().max(500).trim().optional().default(""),
    phone:       z.string().max(20).trim().optional().default(""),
    address:     z.string().max(200).trim().optional().default(""),
    city:        z.string().max(80).trim().optional().default(""),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type InviteVendorInput      = z.infer<typeof inviteVendorSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
