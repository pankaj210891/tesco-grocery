import type { Metadata } from "next";
import OffersClient from "./OffersClient";

export const metadata: Metadata = {
  title: "Offers & Promo Codes",
  description:
    "Browse the latest deals, exclusive promo codes and seasonal discounts at Prakash Supermarket. Save on fresh food, groceries, electronics and more.",
};

export default function OffersPage() {
  return <OffersClient />;
}
