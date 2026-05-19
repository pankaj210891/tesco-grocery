import { z } from "zod";

export const submitKycSchema = z.object({
  panNumber: z
    .string()
    .trim()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format (e.g. ABCDE1234F)"),
  gstNumber: z
    .string()
    .trim()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Invalid GST format (e.g. 27ABCDE1234F1Z5)",
    )
    .or(z.literal("")),
  aadhaarNumber: z
    .string()
    .trim()
    .regex(/^[0-9]{12}$/, "Aadhaar must be exactly 12 digits"),
});

export const adminKycReviewSchema = z.object({
  action:          z.enum(["verified", "rejected"]),
  rejectionReason: z.string().trim().max(300).optional().default(""),
});

export type SubmitKycInput      = z.infer<typeof submitKycSchema>;
export type AdminKycReviewInput = z.infer<typeof adminKycReviewSchema>;
