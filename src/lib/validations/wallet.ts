import { z } from "zod";

export const topupSchema = z.object({
  amount: z
    .number({ message: "Amount must be a number" })
    .min(10, "Minimum top-up is ₹10")
    .max(50000, "Maximum top-up is ₹50,000"),
  description: z.string().trim().max(200).optional(),
});

export const adminCreditSchema = z.object({
  amount: z
    .number({ message: "Amount must be a number" })
    .min(1, "Minimum credit is ₹1")
    .max(100000, "Maximum credit is ₹1,00,000"),
  description: z.string().trim().min(3, "Description is required").max(300),
});

export const adminDebitSchema = z.object({
  amount: z
    .number({ message: "Amount must be a number" })
    .min(1, "Minimum debit is ₹1")
    .max(100000, "Maximum debit is ₹1,00,000"),
  description: z.string().trim().min(3, "Description is required").max(300),
});

export const walletTransactionsQuerySchema = z.object({
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type TopupInput         = z.infer<typeof topupSchema>;
export type AdminCreditInput   = z.infer<typeof adminCreditSchema>;
export type AdminDebitInput    = z.infer<typeof adminDebitSchema>;
