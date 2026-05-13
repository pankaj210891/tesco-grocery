import { z } from "zod";

export const checkoutSchema = z.object({
  // ── Delivery ─────────────────────────────────────────────────────────────
  fullName: z.string().min(2,  "Full name is required"),
  email:    z.string().email("Enter a valid email address"),
  phone:    z
    .string()
    .length(10, "Phone number must be exactly 10 digits")
    .regex(/^\d{10}$/, "Numbers only, no spaces or symbols"),
  address:  z.string().min(5,  "Address is required"),
  city:     z.string().min(2,  "City is required"),
  postcode: z
    .string()
    .min(5,  "Enter a valid postcode")
    .max(8)
    .regex(/^[A-Z0-9 ]{5,8}$/i, "Enter a valid postcode"),

  // ── Payment method ────────────────────────────────────────────────────────
  paymentMethod: z.enum(["razorpay", "cod"], {
    error: "Select a payment method",
  }),
});

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
