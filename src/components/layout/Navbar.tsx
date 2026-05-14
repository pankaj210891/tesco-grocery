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
  Sparkles,
  MapPin,
  HelpCircle,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/store/cart.store";
import { useAuthStore } from "@/store/auth.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useAuthData } from "@/hooks/useAuthData";
import { useHydrated } from "@/hooks/useHydrated";
import ThemeToggle from "@/components/ui/ThemeToggle";

const PRIMARY      = "#0F4C75";
const PRIMARY_DARK = "#0A3352";
const ACCENT       = "#F57C00";

const ANNOUNCEMENTS = [
  "🚚  Free delivery on orders over ₹500",
  "🎁  Exclusive Clubcard member savings every week",
  "✨  New arrivals added daily — shop the latest deals",
  "🏪  Click & Collect free at all Prakash stores",
];

const NAV_CATEGORIES = [
  { label: "Fresh Food",           href: "/categories/fresh-food"          },
  { label: "Bakery",               href: "/categories/bakery"              },
  { label: "Frozen Food",          href: "/categories/frozen-food"         },
  { label: "Treats & Snacks",      href: "/categories/treats-snacks"       },
  { label: "Food Cupboard",        href: "/categories/food-cupboard"       },
  { label: "Drinks",               href: "/categories/drinks"              },
  { label: "Baby & Toddler",       href: "/categories/baby-toddler"        },
  { label: "Health & Beauty",      href: "/categories/health-beauty"       },
  { label: "Pets",                 href: "/categories/pets"                },
  { label: "Household",            href: "/categories/household"           },
  { label: "Electronics & Gaming", href: "/categories/electronics-gaming"  },
  { label: "Clothing",             href: "/categories/clothing-accessories"},
];

const ALL_DEPARTMENTS = [
  { label: "Clothing & Accessories",  href: "/categories/clothing-accessories" },
  { label: "Marketplace",             href: "/categories/marketplace"           },
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
  { label: "Toys & Games",            href: "/categories/toys-games"            },
  { label: "Parties & Seasonal",      href: "/categories/parties-seasonal"      },
  { label: "Sports & Leisure",        href: "/categories/sports-leisure"        },
  { label: "Hobbies & Stationery",    href: "/categories/hobbies-stationery"    },
  { label: "Garden, DIY & Car Care",  href: "/categories/garden-diy-car"        },
  { label: "Kiosk",                   href: "/categories/kiosk"                 },
  { label: "Inspiration & Events",    href: "/categories/inspiration-events"    },
];

function getInitials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function Navbar() {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [accountOpen,  setAccountOpen]  = useState(false);
  const [deptOpen,     setDeptOpen]     = useState(false);
  const [announcIdx,   setAnnouncIdx]   = useState(0);
  const [announcFade,  setAnnouncFade]  = useState(true);
  const [scrolled,     setScrolled]     = useState(false);

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

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (deptRef.current    && !deptRef.current.contains(e.target as Node))    setDeptOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Rotate announcements
  useEffect(() => {
    const interval = setInterval(() => {
      setAnnouncFade(false);
      setTimeout(() => {
        setAnnouncIdx((i) => (i + 1) % ANNOUNCEMENTS.length);
        setAnnouncFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Scroll shadow
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
    <header className={cn("sticky top-0 z-50 transition-shadow duration-300", scrolled && "shadow-lg")}>

      {/* Announcement bar */}
      <div className="bg-[#0A3352] border-b border-white/10 hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-8 flex items-center justify-center">
          <p
            className={cn(
              "text-xs text-blue-200 font-medium text-center transition-opacity duration-300",
              announcFade ? "opacity-100" : "opacity-0",
            )}
          >
            {ANNOUNCEMENTS[announcIdx]}
          </p>
        </div>
      </div>

      {/* Top bar */}
      <div style={{ backgroundColor: PRIMARY }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-3">

          {/* Hamburger — mobile */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="md:hidden flex items-center justify-center p-2 rounded-lg text-white hover:bg-white/15 active:scale-95 transition-all"
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
            <div className="bg-white rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 shadow-sm">
              <Store className="h-4 w-4 text-[#F57C00]" aria-hidden />
              <span className="font-black text-xl tracking-tight leading-none" style={{ color: PRIMARY }}>
                Prakash
              </span>
            </div>
            <span className="hidden lg:block text-white/80 text-xs font-medium leading-tight">Supermarket</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl" role="search">
            <div className={cn(
              "flex items-center w-full h-10 rounded-full overflow-hidden bg-white",
              "border-2 border-transparent focus-within:border-[#F57C00] transition-colors",
            )}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands and more…"
                aria-label="Search products"
                className="flex-1 min-w-0 h-full pl-4 pr-2 text-base md:text-sm text-gray-900 bg-transparent placeholder:text-gray-400 focus:outline-none"
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
                className="shrink-0 flex items-center justify-center w-12 h-full text-white transition-colors hover:brightness-110 active:scale-95"
                style={{ backgroundColor: ACCENT }}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">

            <div className="hidden sm:block">
              <ThemeToggle variant="navbar" />
            </div>

            {/* Account */}
            {hydrated && user ? (
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen((o) => !o)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-white hover:bg-white/15 active:scale-95 transition-all"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                    {getInitials(user.name)}
                  </div>
                  <span className="hidden sm:inline text-xs font-semibold max-w-[64px] truncate">
                    {user.name.split(" ")[0]}
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform hidden sm:block", accountOpen && "rotate-180")} />
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 py-2 z-50">
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ backgroundColor: PRIMARY }}>
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      {user.role !== "customer" && (
                        <span className={cn("mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", user.role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400")}>
                          {user.role}
                        </span>
                      )}
                    </div>

                    <div className="py-1">
                      {user.role === "admin" && (
                        <Link href="/admin" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors">
                          <LayoutDashboard className="h-4 w-4" /> Admin Panel
                        </Link>
                      )}
                      {user.role === "vendor" && (
                        <Link href="/vendor" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors">
                          <Store className="h-4 w-4" /> Vendor Portal
                        </Link>
                      )}
                      {(user.role === "admin" || user.role === "vendor") && (
                        <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                      )}
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white hover:bg-white/15 active:scale-95 transition-all text-xs font-semibold"
              >
                <User className="h-5 w-5" />
                <span className="hidden sm:inline">Sign in</span>
              </Link>
            )}

            {/* Wishlist */}
            <Link
              href="/account/wishlist"
              aria-label={`Wishlist, ${hydrated ? wishlistCount : 0} items`}
              className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-white hover:bg-white/15 active:scale-95 transition-all text-xs"
            >
              <Heart className="h-5 w-5" />
              <span className="hidden sm:inline font-semibold">Saved</span>
              {hydrated && wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none" style={{ backgroundColor: ACCENT }} aria-hidden>
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label={`Cart, ${hydrated ? totalItems : 0} items`}
              className="relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-white hover:bg-white/15 active:scale-95 transition-all text-xs"
            >
              <ShoppingCart className="h-5 w-5" />
              <span className="hidden sm:inline font-semibold">Cart</span>
              {hydrated && totalItems > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none" style={{ backgroundColor: ACCENT }} aria-hidden>
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

          </div>
        </div>
      </div>

      {/* Category nav (desktop) */}
      <nav className="hidden md:block" style={{ backgroundColor: PRIMARY_DARK }} aria-label="Product departments">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">

          {/* All Departments dropdown */}
          <div ref={deptRef} className="relative shrink-0">
            <button
              onClick={() => setDeptOpen((o) => !o)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-r border-white/10",
                deptOpen ? "text-white bg-white/10" : "text-white hover:bg-white/10",
              )}
            >
              <Menu className="h-4 w-4" />
              All Departments
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", deptOpen && "rotate-180")} />
            </button>

            {deptOpen && (
              <div className="absolute top-full left-0 z-50 w-60 bg-white dark:bg-gray-900 shadow-2xl border border-gray-100 dark:border-gray-800 rounded-b-2xl overflow-hidden">
                <div className="overflow-y-auto max-h-80">
                  {ALL_DEPARTMENTS.map((dept) => (
                    <Link
                      key={dept.href}
                      href={dept.href}
                      onClick={() => setDeptOpen(false)}
                      className={cn(
                        "flex items-center px-4 py-2.5 text-sm transition-colors",
                        pathname === dept.href
                          ? "bg-[#0F4C75] text-white font-semibold"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:pl-5",
                      )}
                    >
                      {dept.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scrollable categories */}
          <ul className="flex items-center overflow-x-auto scrollbar-none flex-1 min-w-0">
            {NAV_CATEGORIES.slice(0, 7).map((cat) => (
              <li key={cat.href}>
                <Link
                  href={cat.href}
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2",
                    pathname === cat.href
                      ? "text-white border-[#F57C00] bg-white/10"
                      : "text-blue-200 border-transparent hover:text-white hover:bg-white/8",
                  )}
                >
                  {cat.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right links */}
          <div className="shrink-0 flex items-center border-l border-white/10 gap-1">
            <Link href="/offers" className="flex items-center gap-1 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors" style={{ color: ACCENT }}>
              <Tag className="h-3.5 w-3.5" />
              Offers
            </Link>
            <Link href="/store-locator" className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-blue-200 hover:text-white transition-colors whitespace-nowrap">
              <MapPin className="h-3.5 w-3.5" />
              Find a Store
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-xl overflow-y-auto max-h-[calc(100dvh-64px)]">

          {/* Search + theme */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-4 pb-3 space-y-3">
            <form onSubmit={handleSearch} role="search">
              <div className="flex items-center w-full h-11 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 focus-within:border-[#0F4C75] bg-gray-50 dark:bg-gray-800 transition-colors">
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
                <button type="submit" aria-label="Submit search" className="shrink-0 flex items-center justify-center w-12 h-full text-white transition-colors hover:brightness-110" style={{ backgroundColor: ACCENT }}>
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
            <div className="px-4 pt-3 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Departments</p>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {ALL_DEPARTMENTS.map((dept) => (
                <li key={dept.href}>
                  <Link
                    href={dept.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-6 py-3 text-sm font-medium transition-colors",
                      pathname === dept.href
                        ? "text-[#0F4C75] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50"
                        : "text-gray-700 dark:text-gray-300 hover:text-[#0F4C75] dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800",
                    )}
                  >
                    {dept.label}
                    {pathname === dept.href && <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C75] dark:bg-blue-400" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Quick links */}
            <div className="px-4 pt-4 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Quick links</p>
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 mb-2">
              <li>
                <Link href="/offers" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-semibold transition-colors hover:bg-orange-50 dark:hover:bg-orange-950/30" style={{ color: ACCENT }}>
                  <Tag className="h-4 w-4" /> Special Offers
                </Link>
              </li>
              <li>
                <Link href="/store-locator" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#0F4C75] dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <MapPin className="h-4 w-4" /> Store Locator
                </Link>
              </li>
              <li>
                <Link href="/help" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#0F4C75] dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <HelpCircle className="h-4 w-4" /> Help Centre
                </Link>
              </li>
              {!hydrated || !user ? (
                <li>
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-semibold text-[#0F4C75] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
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
              <li>
                <Link href="/account/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-[#0F4C75] dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Sparkles className="h-4 w-4" /> New Arrivals
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
