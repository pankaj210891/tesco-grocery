import { Suspense } from "react";
import type { Metadata } from "next";
import ConfirmationContent from "./ConfirmationContent";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Order Confirmed — ${siteConfig.name}`,
};

export default function ConfirmationPage() {
  return (
    <Suspense>
      <ConfirmationContent />
    </Suspense>
  );
}
