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
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useAuthData } from "@/hooks/useAuthData";
import { useHydrated } from "@/hooks/useHydrated";
import ThemeToggle from "@/components/ui/ThemeToggle";

/** Primary brand colors — matches globals.css */
const PRIMARY      = "#0F4C75";
const PRIMARY_DARK = "#0A3352";
const ACCENT       = "#F57C00";

/** Nav categories shown in the horizontal desktop bar */
const NAV_CATEGORIES = [
  { label: "Fresh Food",           href: "/categories/fresh-food"          },
  { label: "Bakery",               href: "/categories/bakery"               },
  { label: "Frozen Food",          href: "/categories/frozen-food"          },
  { label: "Treats & Snacks",      href: "/categories/treats-snacks"        },
  { label: "Food Cupboard",        href: "/categories/food-cupboard"        },
  { label: "Drinks",               href: "/categories/drinks"               },
  { label: "Baby & Toddler",       href: "/categories/baby-toddler"         },
  { label: "Health & Beauty",      href: "/categories/health-beauty"        },
  { label: "Pets",                 href: "/categories/pets"                 },
  { label: "Household",            href: "/categories/household"            },
  { label: "Electronics & Gaming", href: "/categories/electronics-gaming"   },
  { label: "Clothing",             href: "/categories/clothing-accessories" },
];

/** Full department list for the mobile drawer */
const ALL_DEPARTMENTS = [
  { label: "Clothing & Accessories", href: "/categories/clothing-accessories" },
  { label: "Marketplace",            href: "/categories/marketplace"           },
  { label: "Fresh Food",             href: "/categories/fresh-food"            },
  { label: "Bakery",                 href: "/categories/bakery"                },
  { label: "Frozen Food",            href: "/categories/frozen-food"           },
  { label: "Treats & Snacks",        href: "/categories/treats-snacks"         },
  { label: "Food Cupboard",          href: "/categories/food-cupboard"         },
  { label: "Drinks",                 href: "/categories/drinks"                },
  { label: "Baby & Toddler",         href: "/categories/baby-toddler"          },
  { label: "Health & Beauty",        href: "/categories/health-beauty"         },
  { label: "Pets",                   href: "/categories/pets"                  },
  { label: "Household",              href: "/categories/household"             },
  { label: "Home & Furniture",       href: "/categories/home-furniture"        },
  { label: "Electronics & Gaming",   href: "/categories/electronics-gaming"    },
  { label: "Toys & Games",           href: "/categories/toys-games"            },
  { label: "Parties & Seasonal",     href: "/categories/parties-seasonal"      },
  { label: "Sports & Leisure",       href: "/categories/sports-leisure"        },
  { label: "Hobbies & Stationery",   href: "/categories/hobbies-stationery"    },
  { label: "Garden, DIY & Car Care", href: "/categories/garden-diy-car"        },
  { label: "Kiosk",                  href: "/categories/kiosk"                 },
  { label: "Inspiration & Events",   href: "/categories/inspiration-events"    },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [deptOpen, setDeptOpen]       = useState(false);
  const accountRef                    = useRef<HTMLDivElement>(null);
  const deptRef                       = useRef<HTMLDivElement>(null);
  const pathname  = usePathname();
  const router    = useRouter();

  const totalItems    = useCartStore((s) => s.totalItems);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  useAuthData();
  const { user, logout } = useAuthStore();
  const resetCart     = useCartStore((s) => s.reset);
  const resetWishlist = useWishlistStore((s) => s.reset);
  const hydrated = useHydrated();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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
    <header className="sticky top-0 z-50 shadow-md">

      {/* ── Top bar ────────────────────────────────────────────── */}
      <div style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">

          {/* Hamburger — mobile only, LEFT of logo */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden flex items-center justify-center p-2 rounded text-white hover:bg-white/10 transition-colors"
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
            <div className="bg-white rounded-lg px-2.5 py-1 flex items-center gap-1.5">
              <Store className="h-4 w-4 text-[#F57C00]" aria-hidden />
              <span
                className="font-black text-xl tracking-tight leading-none"
                style={{ color: PRIMARY }}
              >
                Prakash
              </span>
            </div>
            <span className="hidden lg:block text-white/80 text-xs font-medium leading-tight">
              Supermarket
            </span>
          </Link>

          {/* Search — hidden on mobile */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-2xl"
            role="search"
          >
            <div className={cn(
              "flex items-center w-full h-10 rounded-full overflow-hidden",
              "bg-white border-2 border-transparent focus-within:border-[#F57C00]"
            )}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands and more…"
                aria-label="Search products"
                className="flex-1 min-w-0 h-full pl-4 pr-2 text-sm text-gray-900 bg-transparent placeholder:text-gray-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="shrink-0 flex items-center justify-center w-8 h-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="submit"
                aria-label="Submit search"
                className="shrink-0 flex items-center justify-center w-12 h-full text-white transition-colors"
                style={{ backgroundColor: ACCENT }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#E65100")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = ACCENT)
                }
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">

            {/* Theme toggle */}
            <div className="hidden sm:block">
              <ThemeToggle variant="navbar" />
            </div>

            {/* Account */}
            {hydrated && user ? (
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex flex-col items-center px-2 py-1 rounded text-white hover:bg-white/10 transition-colors text-xs"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                >
                  <User className="h-5 w-5 mb-0.5" />
                  <span className="hidden sm:inline max-w-[72px] truncate">
                    {user.name.split(" ")[0]}
                  </span>
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 py-1 z-50">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                      {user.role !== "customer" && (
                        <span className={`mt-1 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded capitalize ${user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"}`}>
                          {user.role}
                        </span>
                      )}
                    </div>
                    {user.role === "admin" && (
                      <Link href="/admin" onClick={() => setAccountOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors">
                        <LayoutDashboard className="h-4 w-4" /> Admin Panel
                      </Link>
                    )}
                    {user.role === "vendor" && (
                      <Link href="/vendor" onClick={() => setAccountOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors">
                        <Store className="h-4 w-4" /> Vendor Portal
                      </Link>
                    )}
                    {(user.role === "admin" || user.role === "vendor") && (
                      <div className="border-t border-gray-100 dark:border-gray-800 mt-1" />
                    )}
                    <Link
                      href="/account"
                      onClick={() => setAccountOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <User className="h-4 w-4" /> My Account
                    </Link>
                    <Link
                      href="/account/wishlist"
                      onClick={() => setAccountOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Heart className="h-4 w-4" /> Wishlist
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="flex flex-col items-center px-2 py-1 rounded text-white hover:bg-white/10 transition-colors text-xs"
              >
                <User className="h-5 w-5 mb-0.5" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}

            {/* Wishlist */}
            <Link
              href="/account/wishlist"
              aria-label={`Wishlist, ${hydrated ? wishlistCount : 0} items`}
              className="relative flex flex-col items-center px-2 py-1 rounded text-white hover:bg-white/10 transition-colors text-xs"
            >
              <Heart className="h-5 w-5 mb-0.5" />
              <span className="hidden sm:inline">Saved</span>
              {hydrated && wishlistCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
                  style={{ backgroundColor: ACCENT }}
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
              className="relative flex flex-col items-center px-2 py-1 rounded text-white hover:bg-white/10 transition-colors text-xs"
            >
              <ShoppingCart className="h-5 w-5 mb-0.5" />
              <span className="hidden sm:inline">Cart</span>
              {hydrated && totalItems > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
                  style={{ backgroundColor: ACCENT }}
                  aria-hidden
                >
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

          </div>
        </div>
      </div>

      {/* ── Category nav bar (desktop) ──────────────────────────── */}
      <nav
        className="hidden md:block"
        style={{ backgroundColor: PRIMARY_DARK }}
        aria-label="Product departments"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          {/* "All Departments" dropdown — always visible, never scrolls away */}
          <div ref={deptRef} className="relative shrink-0">
            <button
              onClick={() => setDeptOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-r border-white/10",
                deptOpen ? "text-white bg-[#0F4C75]" : "text-white hover:bg-[#0F4C75]"
              )}
            >
              All Departments
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", deptOpen && "rotate-180")} />
            </button>

            {deptOpen && (
              <div className="absolute top-full left-0 z-50 mt-0 w-56 bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800 rounded-b-xl overflow-y-auto max-h-80">
                {ALL_DEPARTMENTS.map((dept) => (
                  <Link
                    key={dept.href}
                    href={dept.href}
                    onClick={() => setDeptOpen(false)}
                    className={cn(
                      "flex items-center px-4 py-2.5 text-sm transition-colors",
                      pathname === dept.href
                        ? "bg-[#0F4C75] text-white font-semibold"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                    )}
                  >
                    {dept.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Scrollable — exactly 7 departments */}
          <ul className="flex items-center overflow-x-auto scrollbar-none flex-1 min-w-0">
            {NAV_CATEGORIES.slice(0, 7).map((cat) => (
              <li key={cat.href}>
                <Link
                  href={cat.href}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                    pathname === cat.href
                      ? "text-white bg-[#0F4C75]"
                      : "text-blue-200 hover:text-white hover:bg-[#0F4C75]"
                  )}
                >
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right-side links — always visible */}
          <div className="shrink-0 flex items-center border-l border-white/10">
            <Link
              href="/offers"
              className="flex items-center px-3 py-2.5 text-sm font-medium text-[#F57C00] hover:text-white transition-colors whitespace-nowrap"
            >
              Special Offers
            </Link>
            <Link
              href="/store-locator"
              className="flex items-center px-3 py-2.5 text-sm font-medium text-blue-200 hover:text-white transition-colors whitespace-nowrap"
            >
              Store Locator
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Mobile drawer ───────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg overflow-y-auto max-h-[calc(100dvh-64px)]">

          {/* Sticky header — search + theme toggle */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <div className="px-4 pt-4 pb-2">
              <form onSubmit={handleSearch} role="search">
                <div className={cn(
                  "flex items-center w-full h-10 rounded-full overflow-hidden",
                  "border border-gray-300 dark:border-gray-700 focus-within:border-[#0F4C75]",
                  "bg-white dark:bg-gray-800"
                )}>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products…"
                    aria-label="Search products"
                    className="flex-1 min-w-0 h-full pl-4 pr-2 text-base bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none"
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
                    className="shrink-0 flex items-center justify-center w-12 h-full text-white"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </div>
            <div className="px-4 py-2 flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Theme</span>
              <ThemeToggle />
            </div>
          </div>

          {/* All departments */}
          <nav aria-label="Mobile departments">
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {ALL_DEPARTMENTS.map((dept) => (
                <li key={dept.href}>
                  <Link
                    href={dept.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block px-6 py-3 text-sm font-medium transition-colors",
                      pathname === dept.href
                        ? "text-[#0F4C75] dark:text-blue-400 bg-blue-50 dark:bg-blue-950"
                        : "text-gray-700 dark:text-gray-300 hover:text-[#0F4C75] dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    {dept.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/offers"
                  onClick={() => setMobileOpen(false)}
                  className="block px-6 py-3 text-sm font-semibold hover:bg-orange-50 dark:hover:bg-orange-950"
                  style={{ color: ACCENT }}
                >
                  🏷️ Special Offers
                </Link>
              </li>
              <li>
                <Link
                  href="/store-locator"
                  onClick={() => setMobileOpen(false)}
                  className="block px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#0F4C75] dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  📍 Store Locator
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  onClick={() => setMobileOpen(false)}
                  className="block px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#0F4C75] dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  ❓ Help Centre
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  onClick={() => setMobileOpen(false)}
                  className="block px-6 py-3 text-sm font-semibold hover:bg-orange-50 dark:hover:bg-orange-950"
                  style={{ color: ACCENT }}
                >
                  All Products →
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
