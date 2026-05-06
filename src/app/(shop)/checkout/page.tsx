import type { Metadata } from "next";
import CheckoutPageContent from "@/components/checkout/CheckoutPageContent";

export const metadata: Metadata = {
  title:       "Checkout",
  description: "Complete your order — delivery details and payment.",
};

export default function CheckoutPage() {
  return <CheckoutPageContent />;
}
