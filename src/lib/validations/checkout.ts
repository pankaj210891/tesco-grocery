import { z } from "zod";

export const checkoutSchema = z.object({
  // ── Delivery ─────────────────────────────────────────────────────────────
  fullName: z.string().min(2,  "Full name is required"),
  email:    z.string().email("Enter a valid email address"),
  phone:    z
    .string()
    .min(10, "Enter a valid phone number")
    .max(15)
    .regex(/^[0-9+\s()-]+$/, "Enter a valid phone number"),
  address:  z.string().min(5,  "Address is required"),
  city:     z.string().min(2,  "City is required"),
  postcode: z
    .string()
    .min(5,  "Enter a valid postcode")
    .max(8)
    .regex(/^[A-Z0-9 ]{5,8}$/i, "Enter a valid postcode"),

  // ── Payment (mock UI — no real processing) ───────────────────────────────
  cardNumber: z
    .string()
    .regex(/^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/, "Enter a valid 16-digit card number"),
  cardName:   z.string().min(2, "Name on card is required"),
  expiry:     z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Format: MM/YY"),
  cvv:        z
    .string()
    .regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
