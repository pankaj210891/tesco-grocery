"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Search,
  User,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Heart,
  Store,
  MapPin,
  HelpCircle,
  Tag,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useAuthData } from "@/hooks/useAuthData";
import { useHydrated } from "@/hooks/useHydrated";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useScrollLock } from "@/hooks/useScrollLock";

const AMBER = "#FCA311";
const BRAND = "#E8920A";

const NAV_LINKS = [
  { label: "Home",       href: "/"              },
  { label: "Shop",       href: "/products"      },
  { label: "Categories", href: "/categories"    },
  { label: "Offers",     href: "/offers"        },
  { label: "Store",      href: "/store-locator" },
  { label: "Help",       href: "/help"          },
];

const ALL_DEPARTMENTS = [
  { label: "Fresh Food",              href: "/categories/fresh-food"            },
  { label: "Bakery",                  href: "/categories/bakery"                },
  { label: "Frozen Food",             href: "/categories/frozen-food"           },
  { label: "Treats & Snacks",         href: "/categories/treats-snacks"         },
  { label: "Food Cupboard",           href: "/categories/food-cupboard"         },
  { label: "Drinks",                  href: "/categories/drinks"                },
  { label: "Baby & Toddler",          href: "/categories/baby-toddler"          },
  { label: "Health & Beauty",         href: "/categories/health-beauty"         },
  { label: "Pets",                    href: "/categories/pets"                  },
  { label: "Household",               href: "/categories/household"             },
  { label: "Home & Furniture",        href: "/categories/home-furniture"        },
  { label: "Electronics & Gaming",    href: "/categories/electronics-gaming"    },
  { label: "Clothing & Accessories",  href: "/categories/clothing-accessories"  },
  { label: "Toys & Games",            href: "/categories/toys-games"            },
  { label: "Sports & Leisure",        href: "/categories/sports-leisure"        },
  { label: "Garden, DIY & Car Care",  href: "/categories/garden-diy-car"        },
];

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function Navbar() {
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  useScrollLock(mobileOpen);
  const [accountOpen, setAccountOpen] = useState(false);
  const [deptOpen,    setDeptOpen]    = useState(false);
  const [scrolled,    setScrolled]    = useState(false);

  const accountRef = useRef<HTMLDivElement>(null);
  const deptRef    = useRef<HTMLDivElement>(null);
  const pathname   = usePathname();
  const router     = useRouter();

  const totalItems    = useCartStore((s) => s.totalItems);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  useAuthData();
  const { user, logout } = useAuthStore();
  const resetCart     = useCartStore((s) => s.reset);
  const resetWishlist = useWishlistStore((s) => s.reset);
  const hydrated = useHydrated();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (deptRef.current    && !deptRef.current.contains(e.target as Node))    setDeptOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 4); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleLogout() {
    logout();
    resetCart();
    resetWishlist();
    setAccountOpen(false);
    toast.success("You've been signed out.");
    router.push("/");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setSearchQuery("");
      setMobileOpen(false);
    }
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 bg-white dark:bg-gray-900 transition-shadow duration-300",
      scrolled ? "shadow-md" : "shadow-sm",
    )}>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden flex items-center justify-center p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-colors transition-transform"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 flex items-center gap-2 hover:opacity-90 transition-opacity"
            aria-label="Prakash Supermarket — Home"
          >
            <div className="flex items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: AMBER }}
              >
                <Store className="h-4 w-4 text-white" aria-hidden />
              </div>
              <div className="leading-none">
                <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white">
                  Prakash
                </span>
                <span className="hidden lg:block text-[10px] font-medium text-gray-400 dark:text-gray-500 tracking-wide">
                  SUPERMARKET
                </span>
              </div>
            </div>
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl mx-4" role="search">
            <div className={cn(
              "flex items-center w-full h-11 rounded-xl overflow-hidden",
              "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
              "focus-within:border-[#FCA311] focus-within:ring-2 focus-within:ring-[#FCA311]/20 transition-colors",
            )}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands and more…"
                aria-label="Search products"
                className="flex-1 min-w-0 h-full pl-4 pr-2 text-base md:text-sm text-gray-900 dark:text-gray-100 bg-transparent placeholder:text-gray-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 flex items-center justify-center w-8 h-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                aria-label="Submit search"
                className="shrink-0 flex items-center justify-center w-12 h-full text-white rounded-r-xl transition-colors hover:brightness-105 active:scale-95"
                style={{ backgroundColor: AMBER }}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">

            {/* Phone — desktop only */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 mr-1">
              <Phone className="h-4 w-4 text-gray-400" aria-hidden />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">+91 98765 43210</span>
            </div>

            <div className="hidden sm:block">
              <ThemeToggle variant="navbar" />
            </div>

            {/* Account */}
            {hydrated && user ? (
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-colors transition-transform"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                    style={{ backgroundColor: BRAND }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold max-w-[60px] truncate">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform hidden sm:block", accountOpen && "rotate-180")} />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 min-w-[14rem] w-max max-w-xs bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ backgroundColor: BRAND }}>
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link href="/account" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <User className="h-4 w-4" /> My Account
                      </Link>
                      <Link href="/account/wishlist" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <Heart className="h-4 w-4" /> Wishlist
                      </Link>
                      <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-colors transition-transform"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline text-[10px] font-semibold">Sign in</span>
              </Link>
            )}

            {/* Wishlist */}
            <Link
              href="/account/wishlist"
              aria-label={`Wishlist, ${hydrated ? wishlistCount : 0} items`}
              className="relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-colors transition-transform"
            >
              <Heart className="h-5 w-5" />
              <span className="hidden sm:inline text-[10px] font-semibold">Wishlist</span>
              {hydrated && wishlistCount > 0 && (
                <span
                  className="absolute -top-0.5 right-1 min-w-[17px] h-[17px] px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
                  style={{ backgroundColor: AMBER }}
                  aria-hidden
                >
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label={`Cart, ${hydrated ? totalItems : 0} items`}
              className="relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-colors transition-transform"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline text-[10px] font-semibold">Cart</span>
              {hydrated && totalItems > 0 && (
                <span
                  className="absolute -top-0.5 right-1 min-w-[17px] h-[17px] px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
                  style={{ backgroundColor: AMBER }}
                  aria-hidden
                >
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

          </div>
        </div>
      </div>

      {/* ── Secondary nav (desktop) ──────────────────────────────── */}
      <nav
        className="hidden md:block bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800"
        aria-label="Product departments"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1">

          {/* All Departments dropdown */}
          <div ref={deptRef} className="relative shrink-0 mr-2">
            <button
              onClick={() => setDeptOpen((o) => !o)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white transition-colors whitespace-nowrap",
                deptOpen ? "brightness-90" : "hover:brightness-105 active:scale-95",
              )}
              style={{ backgroundColor: AMBER }}
            >
              <Menu className="h-4 w-4" />
              Shop By Departments
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", deptOpen && "rotate-180")} />
            </button>

            {deptOpen && (
              <div className="absolute top-full left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-gray-800 rounded-b-2xl overflow-hidden mt-px">
                <div className="overflow-y-auto max-h-80">
                  {ALL_DEPARTMENTS.map((dept) => (
                    <Link
                      key={dept.href}
                      href={dept.href}
                      onClick={() => setDeptOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-2.5 text-sm transition-colors border-l-2",
                        pathname === dept.href
                          ? "border-[#FCA311] bg-amber-50 dark:bg-amber-950/20 text-[#FCA311] font-semibold"
                          : "border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-200",
                      )}
                    >
                      {dept.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Nav links */}
          <ul className="flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-none">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2",
                    pathname === link.href
                      ? "border-[#FCA311] text-[#FCA311] font-semibold"
                      : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300",
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Coupon promo */}
          <Link
            href="/offers"
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-bold whitespace-nowrap rounded-lg transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/20"
            style={{ color: AMBER }}
          >
            <Tag className="h-4 w-4" />
            Get Your Coupon Code
          </Link>
        </div>
      </nav>

      {/* ── Mobile drawer ────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-xl overflow-y-auto max-h-[calc(100dvh-64px)]">

          {/* Search + theme */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-4 pb-3 space-y-3">
            <form onSubmit={handleSearch} role="search">
              <div className="flex items-center w-full h-11 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:border-[#FCA311] bg-gray-50 dark:bg-gray-800 transition-colors">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className="flex-1 min-w-0 h-full pl-4 pr-2 text-base bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
                />
                {searchQuery && (
                  <button type="button" aria-label="Clear search" onClick={() => setSearchQuery("")} className="shrink-0 flex items-center justify-center w-9 h-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button type="submit" aria-label="Submit search" className="shrink-0 flex items-center justify-center w-12 h-full text-white rounded-r-xl transition-colors hover:brightness-105" style={{ backgroundColor: AMBER }}>
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Theme</span>
              <ThemeToggle />
            </div>
          </div>

          {/* Departments */}
          <nav aria-label="Mobile departments">
            <div className="px-4 pt-4 pb-1 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Departments</p>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {ALL_DEPARTMENTS.map((dept) => (
                <li key={dept.href}>
                  <Link
                    href={dept.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors border-l-2",
                      pathname === dept.href
                        ? "border-[#FCA311] text-[#FCA311] bg-amber-50 dark:bg-amber-950/20"
                        : "border-transparent text-gray-700 dark:text-gray-300 hover:text-[#FCA311] hover:bg-gray-50 dark:hover:bg-gray-800",
                    )}
                  >
                    {dept.label}
                    {pathname === dept.href && <span className="w-1.5 h-1.5 rounded-full bg-[#FCA311]" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Quick links</p>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 mb-2">
              <li>
                <Link href="/offers" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-semibold transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/20" style={{ color: AMBER }}>
                  <Tag className="h-4 w-4" /> Special Offers
                </Link>
              </li>
              <li>
                <Link href="/store-locator" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <MapPin className="h-4 w-4" /> Store Locator
                </Link>
              </li>
              <li>
                <Link href="/help" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <HelpCircle className="h-4 w-4" /> Help Centre
                </Link>
              </li>
              {!hydrated || !user ? (
                <li>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors" style={{ color: AMBER }}>
                    <User className="h-4 w-4" /> Sign in / Register
                  </Link>
                </li>
              ) : (
                <li>
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 px-6 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
