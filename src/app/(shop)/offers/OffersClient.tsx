"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/axios";
import { Tag, Copy, Check, Clock, ChevronRight, Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Offer } from "@/types";

function useCountdown(expiresAt: string) {
  const target = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    if (target <= Date.now()) return;
    const id = setInterval(() => {
      setRemaining(Math.max(0, target - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (remaining <= 0) return { expired: true, label: "Expired" };
  const days  = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const mins  = Math.floor((remaining % 3_600_000) / 60_000);
  const secs  = Math.floor((remaining % 60_000) / 1_000);

  if (days >= 7) return { expired: false, label: `${days}d left` };
  if (days >= 1) return { expired: false, label: `${days}d ${hours}h left` };
  return { expired: false, label: `${hours}h ${mins}m ${secs}s left` };
}

function getDiscountLabel(offer: Offer): string {
  if (offer.discountType === "percentage") return `${offer.discountValue}% OFF`;
  if (offer.discountType === "fixed")      return `₹${offer.discountValue} OFF`;
  return "FREE DELIVERY";
}

function OfferCard({ offer }: { offer: Offer }) {
  const [copied, setCopied]         = useState(false);
  const copyTimeoutRef              = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { expired, label }          = useCountdown(offer.expiresAt);
  const discountLabel               = getDiscountLabel(offer);

  useEffect(() => () => clearTimeout(copyTimeoutRef.current), []);

  function copyCode() {
    if (!offer.code) return;
    navigator.clipboard.writeText(offer.code).then(() => {
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // clipboard access denied — no-op; user can copy manually from the code element
    });
  }

  return (
    <div
      data-testid="offer-card"
      className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
      style={{ backgroundColor: offer.color || "#EFF6FF" }}
    >
      {/* Top section */}
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span className="text-4xl leading-none" aria-hidden>{offer.emoji ?? "🏷️"}</span>
          <div className="text-right space-y-1">
            {offer.badge && (
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FCA311] text-white">
                {offer.badge}
              </span>
            )}
            <p className="text-lg font-black text-[#FCA311] leading-none">{discountLabel}</p>
          </div>
        </div>

        <h3 className="font-bold text-gray-900 text-base leading-snug mb-1">{offer.title}</h3>
        {offer.subtitle && (
          <p className="text-sm text-gray-600 mb-2">{offer.subtitle}</p>
        )}
        {offer.description && (
          <p className="text-xs text-gray-500 leading-relaxed">{offer.description}</p>
        )}

        {offer.minOrderValue > 0 && (
          <p className="text-[11px] font-semibold text-gray-500 mt-2">
            Min. order ₹{offer.minOrderValue}
          </p>
        )}
        {offer.eligibleCategories?.length > 0 && (
          <p className="text-[11px] font-semibold text-amber-600 mt-1">
            Valid for: {offer.eligibleCategories.map((c) => c.replace(/-/g, " ")).join(", ")}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm border-t border-black/5 p-4 space-y-3">
        {/* Countdown */}
        <div className={cn("flex items-center gap-1.5 text-xs font-semibold", expired ? "text-red-500" : "text-orange-600")}>
          <Clock className="h-3.5 w-3.5" />
          {label}
        </div>

        {/* Code */}
        {offer.code && (
          <div className="flex items-center gap-2">
            <code data-testid="offer-code" className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-gray-800 dark:text-gray-200 tracking-widest">
              {offer.code}
            </code>
            <button
              data-testid="copy-code-btn"
              onClick={copyCode}
              disabled={expired}
              aria-label="Copy promo code"
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                expired
                  ? "opacity-40 cursor-not-allowed"
                  : "bg-[#FCA311] text-white hover:bg-[#E8920A]"
              )}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* CTA */}
        <Link
          data-testid="shop-now-btn"
          href={offer.href}
          className={cn(
            "flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-sm font-semibold transition-colors",
            expired
              ? "bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none"
              : "bg-[#FCA311] text-white hover:bg-[#E8920A]"
          )}
        >
          Shop now <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

const DEPT_FILTERS = [
  { key: "all",            label: "All Offers" },
  { key: "fresh-food",     label: "Fresh Food" },
  { key: "bakery",         label: "Bakery" },
  { key: "frozen-food",    label: "Frozen" },
  { key: "drinks",         label: "Drinks" },
  { key: "health-beauty",  label: "Health & Beauty" },
];

export default function OffersClient() {
  const [offers,  setOffers]  = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await apiClient.get<{ success: boolean; data: Offer[] }>("/api/offers");
        if (data.success) setOffers(data.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load offers");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    let list = filter === "all" ? offers : offers.filter((o) => o.category === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.title.toLowerCase().includes(q) ||
          (o.code ?? "").toLowerCase().includes(q) ||
          (o.description ?? "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [offers, filter, search]);

  return (
    <main data-testid="offers-page" className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-[#FCA311] text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4">
            <Tag className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">Special Offers</h1>
          <p className="text-amber-100 text-base mb-6">
            Exclusive deals, promo codes, and limited-time savings
          </p>
          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              data-testid="offers-search-input"
              type="search"
              aria-label="Search offers and promo codes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search offers or promo codes…"
              className="w-full h-12 pl-10 pr-4 rounded-xl text-base md:text-sm text-gray-900 bg-white/95 backdrop-blur-sm shadow-lg shadow-black/10 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DEPT_FILTERS.map((f) => (
            <button
              key={f.key}
              data-testid={`offer-filter-${f.key}`}
              onClick={() => setFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                filter === f.key
                  ? "bg-[#FCA311] text-white"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-[#FCA311] hover:text-[#FCA311]"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div data-testid="offers-error" className="text-center py-20 text-red-500 dark:text-red-400">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-60" />
            <p className="font-semibold text-lg">Could not load offers</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-lg">No offers available</p>
            <p className="text-sm">Check back soon for new deals</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((offer) => <OfferCard key={offer._id} offer={offer} />)}
          </div>
        )}
      </div>
    </main>
  );
}
