import { Suspense } from "react";
import type { Metadata } from "next";
import ConfirmationContent from "./ConfirmationContent";

export const metadata: Metadata = {
  title: "Order Confirmed — Prakash Supermarket",
};

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}
