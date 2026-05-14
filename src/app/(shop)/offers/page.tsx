"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { Tag, Copy, Check, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Offer } from "@/types";

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));

  useEffect(() => {
    if (remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [remaining]);

  if (remaining <= 0) return { expired: true, label: "Expired" };
  const days  = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const mins  = Math.floor((remaining % 3_600_000) / 60_000);
  const secs  = Math.floor((remaining % 60_000) / 1_000);

  if (days >= 7)  return { expired: false, label: `${days}d left` };
  if (days >= 1)  return { expired: false, label: `${days}d ${hours}h left` };
  return { expired: false, label: `${hours}h ${mins}m ${secs}s left` };
}

function OfferCard({ offer }: { offer: Offer }) {
  const [copied, setCopied] = useState(false);
  const { expired, label } = useCountdown(offer.expiresAt);

  function copyCode() {
    if (!offer.code) return;
    navigator.clipboard.writeText(offer.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const discountLabel =
    offer.discountType === "percentage"   ? `${offer.discountValue}% OFF` :
    offer.discountType === "fixed"        ? `₹${offer.discountValue} OFF` :
                                            "FREE DELIVERY";

  return (
    <div
      className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
      style={{ backgroundColor: offer.color ?? "#F9FAFB" }}
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
            <code className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5 text-sm font-mono font-bold text-gray-800 dark:text-gray-200 tracking-widest">
              {offer.code}
            </code>
            <button
              onClick={copyCode}
              disabled={expired}
              aria-label="Copy code"
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

export default function OffersPage() {
  const [offers,  setOffers]  = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await axios.get<{ success: boolean; data: Offer[] }>("/api/offers");
        if (data.success) setOffers(data.data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(
    () => filter === "all" ? offers : offers.filter((o) => o.category === filter),
    [offers, filter]
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-[#FCA311] text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4">
            <Tag className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">Special Offers</h1>
          <p className="text-blue-200 text-base">
            Exclusive deals, promo codes, and limited-time savings
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {DEPT_FILTERS.map((f) => (
            <button
              key={f.key}
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
