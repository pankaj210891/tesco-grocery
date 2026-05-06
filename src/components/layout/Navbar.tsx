"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Search,
  User,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/store/cart.store";

const categories = [
  { label: "Fresh Food", href: "/categories/fresh-food" },
  { label: "Bakery", href: "/categories/bakery" },
  { label: "Dairy & Eggs", href: "/categories/dairy-eggs" },
  { label: "Meat & Fish", href: "/categories/meat-fish" },
  { label: "Frozen", href: "/categories/frozen-food" },
  { label: "Drinks", href: "/categories/drinks" },
  { label: "Snacks", href: "/categories/snacks" },
  { label: "Household", href: "/categories/household" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const totalItems = useCartStore((s) => s.totalItems);

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
      {/* ── Top bar ── */}
      <div className="bg-[#00539F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="shrink-0 bg-white rounded px-2.5 py-1 hover:opacity-90 transition-opacity"
            aria-label="Tesco Home"
          >
            <span className="text-[#00539F] font-black text-2xl tracking-tight leading-none">
              Tesco
            </span>
          </Link>

          {/* Search — hidden on mobile, visible md+ */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-2xl"
            role="search"
          >
            <div className="relative w-full">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands and more…"
                aria-label="Search products"
                className={cn(
                  "w-full h-10 pl-4 pr-12 rounded-full text-sm text-gray-900",
                  "bg-white border-2 border-transparent",
                  "focus:outline-none focus:border-[#EE1C2E]",
                  "placeholder:text-gray-400"
                )}
              />
              <button
                type="submit"
                aria-label="Submit search"
                className={cn(
                  "absolute right-0 top-0 h-10 w-12 flex items-center justify-center",
                  "bg-[#EE1C2E] rounded-r-full text-white",
                  "hover:bg-[#C01525] transition-colors"
                )}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </form>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            {/* Account */}
            <Link
              href="/login"
              className={cn(
                "flex flex-col items-center px-2 py-1 rounded text-white",
                "hover:bg-[#003B7A] transition-colors text-xs"
              )}
            >
              <User className="h-5 w-5 mb-0.5" />
              <span className="hidden sm:inline">Account</span>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label={`Cart, ${totalItems} items`}
              className={cn(
                "relative flex flex-col items-center px-2 py-1 rounded text-white",
                "hover:bg-[#003B7A] transition-colors text-xs"
              )}
            >
              <ShoppingCart className="h-5 w-5 mb-0.5" />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1",
                    "bg-[#EE1C2E] text-white text-[10px] font-bold",
                    "rounded-full flex items-center justify-center leading-none"
                  )}
                  aria-hidden
                >
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden flex items-center justify-center p-2 rounded text-white hover:bg-[#003B7A] transition-colors"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Category nav bar (desktop) ── */}
      <nav
        className="hidden md:block bg-[#003B7A]"
        aria-label="Product categories"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <li key={cat.href}>
                <Link
                  href={cat.href}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                    pathname === cat.href
                      ? "text-white bg-[#00539F]"
                      : "text-blue-200 hover:text-white hover:bg-[#00539F]"
                  )}
                >
                  {cat.label}
                </Link>
              </li>
            ))}
            <li className="ml-auto">
              <Link
                href="/products"
                className="flex items-center gap-1 px-3 py-2.5 text-sm font-medium text-blue-200 hover:text-white transition-colors whitespace-nowrap"
              >
                All Products <ChevronDown className="h-3.5 w-3.5" />
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-lg">
          {/* Mobile search */}
          <div className="px-4 pt-4 pb-2">
            <form onSubmit={handleSearch} role="search">
              <div className="relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products…"
                  aria-label="Search products"
                  className={cn(
                    "w-full h-10 pl-4 pr-12 rounded-full text-sm",
                    "border border-gray-300 focus:outline-none focus:border-[#00539F]"
                  )}
                />
                <button
                  type="submit"
                  aria-label="Submit search"
                  className="absolute right-0 top-0 h-10 w-12 flex items-center justify-center bg-[#EE1C2E] rounded-r-full text-white"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Mobile category links */}
          <nav aria-label="Mobile product categories">
            <ul className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <li key={cat.href}>
                  <Link
                    href={cat.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "block px-6 py-3 text-sm font-medium transition-colors",
                      pathname === cat.href
                        ? "text-[#00539F] bg-blue-50"
                        : "text-gray-700 hover:text-[#00539F] hover:bg-gray-50"
                    )}
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/products"
                  onClick={() => setMobileOpen(false)}
                  className="block px-6 py-3 text-sm font-medium text-[#EE1C2E] hover:bg-red-50"
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
