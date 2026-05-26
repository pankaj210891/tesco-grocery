"use client";

import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { VENDOR_NAV } from "@/config/quick-nav-items";

export default function VendorSidebar() {
  return (
    <DashboardSidebar
      variant="vendor"
      panelTitle="Vendor Portal"
      nav={VENDOR_NAV}
      rootHref="/vendor"
    />
  );
}
