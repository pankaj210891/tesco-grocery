import type { Metadata } from "next";
import CartPageContent from "@/components/cart/CartPageContent";

export const metadata: Metadata = {
  title: "Your Cart",
  description: "Review your items and proceed to checkout.",
};

export default function CartPage() {
  return <CartPageContent />;
}
