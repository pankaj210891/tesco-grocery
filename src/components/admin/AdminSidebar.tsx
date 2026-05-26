"use client";

import DashboardSidebar from "@/components/layout/DashboardSidebar";
import { ADMIN_NAV } from "@/config/quick-nav-items";

export default function AdminSidebar() {
  return (
    <DashboardSidebar
      variant="admin"
      panelTitle="Admin Panel"
      nav={ADMIN_NAV}
      rootHref="/admin"
    />
  );
}
