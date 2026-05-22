import type { Metadata } from "next";
import HelpClient from "./HelpClient";

export const metadata: Metadata = {
  title: "Help Centre",
  description:
    "Get answers to your questions about orders, delivery, returns, payments and your Prakash Supermarket account. Browse our FAQ or contact support.",
};

export default function HelpPage() {
  return <HelpClient />;
}
