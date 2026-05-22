"use client";

import DashboardSidebar, { NavItem } from "@/components/layout/DashboardSidebar";
import { LayoutDashboard, Package, ShoppingBag, Store, ShieldCheck, TrendingUp, BarChart2 } from "lucide-react";

const NAV: NavItem[] = [
  { href: "/vendor",            label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/products",   label: "Products",  icon: Package         },
  { href: "/vendor/orders",     label: "Orders",    icon: ShoppingBag     },
  { href: "/vendor/analytics",  label: "Analytics", icon: BarChart2       },
  { href: "/vendor/earnings",   label: "Earnings",  icon: TrendingUp      },
  { href: "/vendor/profile",    label: "Profile",   icon: Store           },
  { href: "/vendor/kyc",        label: "KYC",       icon: ShieldCheck     },
];

export default function VendorSidebar() {
  return (
    <DashboardSidebar
      variant="vendor"
      panelTitle="Vendor Portal"
      nav={NAV}
      rootHref="/vendor"
    />
  );
}
