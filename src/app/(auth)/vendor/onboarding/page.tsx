"use client";

import { Suspense } from "react";
import VendorOnboardingForm from "./VendorOnboardingForm";

export default function VendorOnboardingPage() {
  return (
    <Suspense>
      <VendorOnboardingForm />
    </Suspense>
  );
}
