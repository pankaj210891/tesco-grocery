"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import type { MarketingPreference } from "@/types";

const OPTIONS: { value: MarketingPreference; label: string; description: string }[] = [
  {
    value:       "email_digital_post",
    label:       "Email, digital and post",
    description: "We’ll contact you by email, text, online advertising, and post and push notifications.",
  },
  {
    value:       "digital_post_only",
    label:       "Digital and post (without email)",
    description: "You won’t get marketing emails. We’ll contact you by text, online advertising, post and push notifications.",
  },
  {
    value:       "unsubscribed",
    label:       "Unsubscribe from all",
    description: "We’ll still send you essential information about your orders, customer service messages, and vouchers.",
  },
];

export default function MarketingPreferencesPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user, token } = useAuthStore();

  const [selected,    setSelected]    = useState<MarketingPreference | null>(null);
  const [brands,      setBrands]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [loadError,   setLoadError]   = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login?redirect=/account/preferences/marketing");
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!token) return;
    async function load() {
      try {
        const client = authClient(token!);
        const { data: json } = await client.get<{
          data: { marketingPreference: MarketingPreference | null; hearFromBrands: boolean };
        }>("/api/account/preferences/marketing");
        setSelected(json.data.marketingPreference ?? "email_digital_post");
        setBrands(json.data.hearFromBrands ?? false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load preferences.");
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token]);

  async function handleSave() {
    if (!token || !selected) return;
    setSaving(true);
    try {
      const client = authClient(token);
      await client.put("/api/account/preferences/marketing", {
        marketingPreference: selected,
        hearFromBrands: brands,
      });
      toast.success("Marketing preferences saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((n) => <div key={n} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
        <Link href="/account" className="hover:text-[#0F4C75] dark:hover:text-blue-400 transition-colors">My account</Link>
        <span aria-hidden>/</span>
        <span className="text-gray-800 dark:text-white font-medium">Marketing preferences</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/account"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden />
        </Link>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">Marketing preferences</h1>
      </div>

      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700/60">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <Mail className="h-5 w-5 text-[#0F4C75] dark:text-blue-400" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">How do you want to hear from us?</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This is how you get special offers, helpful information and exclusive coupons.
            </p>
          </div>
        </div>

        {/* Radio options */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => <div key={n} className="animate-pulse h-16 bg-gray-100 dark:bg-gray-700/40 rounded-xl" />)}
          </div>
        ) : (
          <fieldset className="space-y-3">
            <legend className="sr-only">Choose which methods of contact best suit you.</legend>
            <p className="text-xs text-gray-500 dark:text-gray-400">Choose which methods of contact best suit you.</p>
            {OPTIONS.map(({ value, label, description }) => {
              const checked = selected === value;
              return (
                <label
                  key={value}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    checked
                      ? "border-[#0F4C75] dark:border-blue-500 bg-blue-50 dark:bg-blue-900/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="marketing"
                    value={value}
                    checked={checked}
                    onChange={() => {
                      setSelected(value);
                      if (value === "unsubscribed") setBrands(false);
                    }}
                    className="mt-0.5 h-4 w-4 border-gray-300 text-[#0F4C75] focus:ring-[#0F4C75]/40 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                    {checked && value === "email_digital_post" && (
                      <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Sensitive occasions</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Choose which occasions you feel comfortable receiving emails about.</p>
                        <button
                          disabled
                          className="text-xs font-semibold text-gray-400 dark:text-gray-500 cursor-not-allowed mt-1"
                          title="Coming soon"
                        >
                          Manage sensitive occasions &rsaquo;
                        </button>
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </fieldset>
        )}

        {/* Hear from brands */}
        {!loading && (
          <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
            <input
              type="checkbox"
              checked={brands}
              onChange={(e) => setBrands(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#0F4C75] focus:ring-[#0F4C75]/40 cursor-pointer shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white">Hear from selected brands</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                We&rsquo;ll sometimes send you emails or adverts about products and services from other brands that we think you&rsquo;ll like.
              </p>
            </div>
          </label>
        )}

        <button
          onClick={() => void handleSave()}
          disabled={saving || loading || !selected || loadError}
          className="w-full sm:w-auto px-6 py-3 bg-[#0F4C75] hover:bg-[#0d3f63] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F4C75]/40"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>

      {/* Other marketing preferences */}
      <div className="mt-5 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700/40">
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-2">Other marketing preferences</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Use these links to manage your other marketing preferences:</p>
        <div className="space-y-1">
          <span className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed" title="Coming soon">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Email newsletter settings
          </span>
          <span className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 cursor-not-allowed" title="Coming soon">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
            App notification settings
          </span>
        </div>
      </div>
    </div>
  );
}
