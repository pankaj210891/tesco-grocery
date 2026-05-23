import type { Metadata } from "next";
import StoreLocatorClient from "./StoreLocatorClient";

export const metadata: Metadata = {
  title: "Store Locator",
  description:
    "Find your nearest Prakash Supermarket. View opening hours, facilities, contact details and directions for all locations.",
};

export default function StoreLocatorPage() {
  return <StoreLocatorClient />;
}
