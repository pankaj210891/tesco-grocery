import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Store,
  FolderOpen,
  Tag,
  Sliders,
  Clock,
  BarChart2,
  Percent,
  Banknote,
  Receipt,
  Scale,
  Leaf,
  LayoutTemplate,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Home,
  ShoppingCart,
  Heart,
  MapPin,
  HelpCircle,
  User,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type QuickNavRole = "admin" | "vendor" | "customer" | "guest";

export interface QuickNavItem {
  href:   string;
  label:  string;
  icon:   LucideIcon;
  group:  string;
  roles:  QuickNavRole[];    // which roles can see this item
  keywords?: string[];       // extra search terms beyond label
}

// ── Admin routes ─────────────────────────────────────────────────────────────

export const ADMIN_NAV: QuickNavItem[] = [
  { href: "/admin",                     label: "Dashboard",          icon: LayoutDashboard, group: "Admin", roles: ["admin"] },
  { href: "/admin/products",            label: "Products",           icon: Package,         group: "Admin", roles: ["admin"], keywords: ["inventory", "catalogue"] },
  { href: "/admin/orders",              label: "Orders",             icon: ShoppingBag,     group: "Admin", roles: ["admin"] },
  { href: "/admin/users",               label: "Users",              icon: Users,           group: "Admin", roles: ["admin"], keywords: ["customers", "members"] },
  { href: "/admin/vendors",             label: "Vendors",            icon: Store,           group: "Admin", roles: ["admin"], keywords: ["sellers", "merchants"] },
  { href: "/admin/categories",          label: "Categories",         icon: FolderOpen,      group: "Admin", roles: ["admin"] },
  { href: "/admin/category-attributes", label: "Product Attributes", icon: Sliders,         group: "Admin", roles: ["admin"], keywords: ["attributes", "specs"] },
  { href: "/admin/promocodes",          label: "Promo Codes",        icon: Tag,             group: "Admin", roles: ["admin"], keywords: ["discount", "coupon"] },
  { href: "/admin/delivery-slots",      label: "Delivery Slots",     icon: Clock,           group: "Admin", roles: ["admin"] },
  { href: "/admin/inventory",           label: "Inventory",          icon: BarChart2,       group: "Admin", roles: ["admin"], keywords: ["stock"] },
  { href: "/admin/commission",          label: "Commission",         icon: Percent,         group: "Admin", roles: ["admin"] },
  { href: "/admin/earnings",            label: "Earnings",           icon: Banknote,        group: "Admin", roles: ["admin"], keywords: ["revenue", "payouts"] },
  { href: "/admin/transactions",        label: "Transactions",       icon: Receipt,         group: "Admin", roles: ["admin"], keywords: ["payments", "history"] },
  { href: "/admin/wallets",             label: "Wallets",            icon: Wallet,          group: "Admin", roles: ["admin"] },
  { href: "/admin/analytics",           label: "Analytics",          icon: BarChart2,       group: "Admin", roles: ["admin"], keywords: ["reports", "stats"] },
  { href: "/admin/homepage-sections",   label: "Homepage",           icon: LayoutTemplate,  group: "Admin", roles: ["admin"], keywords: ["banners", "cms"] },
  { href: "/admin/dietary-options",     label: "Dietary Options",    icon: Leaf,            group: "Admin", roles: ["admin"] },
  { href: "/admin/legal-pages",         label: "Legal Pages",        icon: Scale,           group: "Admin", roles: ["admin"], keywords: ["terms", "privacy"] },
];

// ── Vendor routes ────────────────────────────────────────────────────────────

export const VENDOR_NAV: QuickNavItem[] = [
  { href: "/vendor",           label: "Dashboard", icon: LayoutDashboard, group: "Vendor", roles: ["vendor", "admin"] },
  { href: "/vendor/products",  label: "Products",  icon: Package,         group: "Vendor", roles: ["vendor", "admin"], keywords: ["inventory", "catalogue"] },
  { href: "/vendor/orders",    label: "Orders",    icon: ShoppingBag,     group: "Vendor", roles: ["vendor", "admin"] },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart2,       group: "Vendor", roles: ["vendor", "admin"], keywords: ["stats", "reports"] },
  { href: "/vendor/earnings",  label: "Earnings",  icon: TrendingUp,      group: "Vendor", roles: ["vendor", "admin"], keywords: ["revenue", "payouts"] },
  { href: "/vendor/profile",   label: "Profile",   icon: Store,           group: "Vendor", roles: ["vendor", "admin"], keywords: ["settings"] },
  { href: "/vendor/kyc",       label: "KYC",       icon: ShieldCheck,     group: "Vendor", roles: ["vendor", "admin"], keywords: ["verification", "documents"] },
];

// ── Shop (customer) routes ────────────────────────────────────────────────────

export const SHOP_NAV: QuickNavItem[] = [
  { href: "/",               label: "Home",          icon: Home,        group: "Shop", roles: ["customer", "guest"] },
  { href: "/products",       label: "Shop",          icon: ShoppingBag, group: "Shop", roles: ["customer", "guest"], keywords: ["products", "browse"] },
  { href: "/categories",     label: "Categories",    icon: FolderOpen,  group: "Shop", roles: ["customer", "guest"] },
  { href: "/offers",         label: "Offers",        icon: Tag,         group: "Shop", roles: ["customer", "guest"], keywords: ["deals", "discount", "coupon"] },
  { href: "/store-locator",  label: "Store Locator", icon: MapPin,      group: "Shop", roles: ["customer", "guest"], keywords: ["location", "branch"] },
  { href: "/help",           label: "Help Centre",   icon: HelpCircle,  group: "Shop", roles: ["customer", "guest"], keywords: ["support", "faq"] },
];

// ── Account routes (logged-in customers) ─────────────────────────────────────

export const ACCOUNT_NAV: QuickNavItem[] = [
  { href: "/account",                  label: "My Account",      icon: User,        group: "Account", roles: ["customer"] },
  { href: "/account/orders",           label: "My Orders",       icon: ShoppingBag, group: "Account", roles: ["customer"], keywords: ["order history"] },
  { href: "/account/wishlist",         label: "Wishlist",        icon: Heart,       group: "Account", roles: ["customer"] },
  { href: "/account/addresses",        label: "Addresses",       icon: MapPin,      group: "Account", roles: ["customer"] },
  { href: "/account/preferences",      label: "Preferences",     icon: Settings,    group: "Account", roles: ["customer"], keywords: ["dietary", "settings"] },
  { href: "/account/security",         label: "Security",        icon: ShieldCheck, group: "Account", roles: ["customer"], keywords: ["password", "2fa"] },
  { href: "/cart",                     label: "Cart",             icon: ShoppingCart,group: "Account", roles: ["customer"], keywords: ["trolley", "basket"] },
];

// ── All items combined ────────────────────────────────────────────────────────

export const ALL_QUICK_NAV_ITEMS: QuickNavItem[] = [
  ...ADMIN_NAV,
  ...VENDOR_NAV,
  ...SHOP_NAV,
  ...ACCOUNT_NAV,
];

/**
 * Returns items visible to a given role.
 * - "admin"    → admin routes + vendor routes (admins can also view vendor portal)
 * - "vendor"   → vendor routes only
 * - "customer" → shop + account routes
 * - "guest"    → shop routes (no account links)
 */
export function getNavItemsForRole(role: QuickNavRole): QuickNavItem[] {
  return ALL_QUICK_NAV_ITEMS.filter((item) => item.roles.includes(role));
}
