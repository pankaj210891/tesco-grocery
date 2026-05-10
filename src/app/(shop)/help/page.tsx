"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Search, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Faq, FaqCategory } from "@/types";

const CATEGORIES: { key: FaqCategory | "all"; label: string; emoji: string }[] = [
  { key: "all",      label: "All Topics",  emoji: "📋" },
  { key: "general",  label: "General",     emoji: "💬" },
  { key: "account",  label: "Account",     emoji: "👤" },
  { key: "orders",   label: "Orders",      emoji: "📦" },
  { key: "delivery", label: "Delivery",    emoji: "🚚" },
  { key: "payments", label: "Payments",    emoji: "💳" },
  { key: "returns",  label: "Returns",     emoji: "↩️" },
];

function FaqItem({ faq }: { faq: Faq }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">
          {faq.question}
        </span>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
          : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
        }
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [faqs,    setFaqs]    = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [active,  setActive]  = useState<FaqCategory | "all">("all");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    async function load() {
      try {
        const { data } = await axios.get<{ success: boolean; data: Faq[] }>("/api/faqs");
        if (data.success) setFaqs(data.data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = useMemo(() => {
    let list = active === "all" ? faqs : faqs.filter((f) => f.category === active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
    }
    return list;
  }, [faqs, active, search]);

  const grouped = useMemo(() => {
    if (active !== "all" || search.trim()) return { [active]: filtered };
    return filtered.reduce<Record<string, Faq[]>>((acc, faq) => {
      if (!acc[faq.category]) acc[faq.category] = [];
      acc[faq.category].push(faq);
      return acc;
    }, {});
  }, [filtered, active, search]);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-[#0F4C75] text-white py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4">
            <HelpCircle className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black mb-2">Help Centre</h1>
          <p className="text-blue-200 text-base mb-6">
            Answers to your most common questions
          </p>
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for answers…"
              className="w-full h-12 pl-10 pr-4 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#F57C00]"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => { setActive(cat.key); setSearch(""); }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                active === cat.key
                  ? "bg-[#0F4C75] text-white shadow-sm"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-[#0F4C75] hover:text-[#0F4C75] dark:hover:text-blue-400"
              )}
            >
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <HelpCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-lg">No results found</p>
            <p className="text-sm">Try a different search term or category</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([cat, items]) => {
              const catMeta = CATEGORIES.find((c) => c.key === cat);
              return (
                <section key={cat}>
                  {(active === "all" && !search.trim()) && catMeta && (
                    <h2 className="flex items-center gap-2 text-base font-bold text-gray-800 dark:text-gray-200 mb-3">
                      <span>{catMeta.emoji}</span> {catMeta.label}
                    </h2>
                  )}
                  <div className="space-y-2">
                    {items.map((faq) => <FaqItem key={faq._id} faq={faq} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* Contact CTA */}
        {!loading && (
          <div className="mt-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 text-center">
            <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">Still need help?</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Our customer care team is available Mon–Sat 8am–8pm.
            </p>
            <a
              href="mailto:support@prakashsupermarket.co.uk"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F4C75] text-white text-sm font-semibold hover:bg-[#0A3352] transition-colors"
            >
              Contact Support
            </a>
          </div>
        )}
      </div>
    </main>
  );
}
