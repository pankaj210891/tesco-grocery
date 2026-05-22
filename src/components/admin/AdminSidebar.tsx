"use client";

import DashboardSidebar, { NavItem } from "@/components/layout/DashboardSidebar";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Store,
  FolderOpen, Tag, Sliders, Clock, BarChart2, Percent, Banknote, Receipt, Scale, Leaf, LayoutTemplate,
} from "lucide-react";

const NAV: NavItem[] = [
  { href: "/admin",                     label: "Dashboard",          icon: LayoutDashboard },
  { href: "/admin/products",            label: "Products",           icon: Package         },
  { href: "/admin/orders",              label: "Orders",             icon: ShoppingBag     },
  { href: "/admin/users",               label: "Users",              icon: Users           },
  { href: "/admin/vendors",             label: "Vendors",            icon: Store           },
  { href: "/admin/categories",          label: "Categories",         icon: FolderOpen      },
  { href: "/admin/category-attributes", label: "Product Attributes", icon: Sliders         },
  { href: "/admin/promocodes",          label: "Promo Codes",        icon: Tag             },
  { href: "/admin/delivery-slots",      label: "Delivery Slots",     icon: Clock           },
  { href: "/admin/inventory",           label: "Inventory",          icon: BarChart2       },
  { href: "/admin/commission",          label: "Commission",         icon: Percent         },
  { href: "/admin/earnings",            label: "Earnings",           icon: Banknote        },
  { href: "/admin/transactions",        label: "Transactions",       icon: Receipt         },
  { href: "/admin/analytics",           label: "Analytics",          icon: BarChart2       },
  { href: "/admin/homepage-sections",    label: "Homepage",           icon: LayoutTemplate  },
  { href: "/admin/dietary-options",      label: "Dietary Options",    icon: Leaf            },
  { href: "/admin/legal-pages",         label: "Legal Pages",        icon: Scale           },
];

export default function AdminSidebar() {
  return (
    <DashboardSidebar
      variant="admin"
      panelTitle="Admin Panel"
      nav={NAV}
      rootHref="/admin"
    />
  );
}
