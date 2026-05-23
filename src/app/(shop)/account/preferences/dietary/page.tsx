"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Leaf } from "lucide-react";
import { toast } from "sonner";
import { authClient, apiClient } from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import type { DietaryOption } from "@/types";

export default function DietaryPreferencesPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user, token } = useAuthStore();

  const [options,    setOptions]    = useState<DietaryOption[]>([]);
  const [selected,   setSelected]   = useState<Set<string>>(new Set());
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [loadError,  setLoadError]  = useState(false);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login?redirect=/account/preferences/dietary");
  }, [hydrated, user, router]);

  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        // Fetch available options and the user's saved preferences in parallel
        const [optionsRes, prefsRes] = await Promise.all([
          apiClient.get<{ success: boolean; data: DietaryOption[] }>("/api/dietary-options"),
          authClient(token!).get<{ data: { dietaryPreferences: string[] } }>(
            "/api/account/preferences/dietary"
          ),
        ]);

        setOptions(optionsRes.data.data ?? []);
        setSelected(new Set(prefsRes.data.data.dietaryPreferences ?? []));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load preferences.");
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token]);

  function toggle(value: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) { next.delete(value); } else { next.add(value); }
      return next;
    });
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      const client = authClient(token);
      await client.put("/api/account/preferences/dietary", {
        dietaryPreferences: Array.from(selected),
      });
      toast.success("Dietary preferences saved.");
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
          {[1, 2, 3, 4].map((n) => <div key={n} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
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
        <span className="text-gray-800 dark:text-white font-medium">Dietary preferences</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/account"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden />
        </Link>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">Dietary preferences</h1>
      </div>

      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-700/60">
          <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
            <Leaf className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Let us know your dietary preferences</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Select all that apply to you.</p>
          </div>
        </div>

        {/* Checkboxes */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <div key={n} className="animate-pulse h-12 bg-gray-100 dark:bg-gray-700/40 rounded-xl" />
            ))}
          </div>
        ) : loadError ? (
          <p className="text-sm text-red-500 dark:text-red-400 py-4 text-center">
            Failed to load dietary options. Please refresh and try again.
          </p>
        ) : options.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No dietary options available at the moment.
          </p>
        ) : (
          <fieldset className="space-y-2">
            <legend className="sr-only">Dietary preferences</legend>
            {options.map(({ value, label, emoji }) => {
              const checked = selected.has(value);
              return (
                <label
                  key={value}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    checked
                      ? "border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(value)}
                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                  />
                  <span className="text-base" aria-hidden>{emoji}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-white flex-1">{label}</span>
                </label>
              );
            })}
          </fieldset>
        )}

        <button
          onClick={() => void handleSave()}
          disabled={saving || loading || loadError}
          className="w-full sm:w-auto px-6 py-3 bg-[#0F4C75] hover:bg-[#0d3f63] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F4C75]/40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Info footer */}
      <div className="mt-5 bg-gray-50 dark:bg-gray-800/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700/40">
        <p className="text-sm font-bold text-gray-800 dark:text-white mb-1">How we use this information</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Thanks for letting us know your dietary preferences. We can now show you products you might like and send you personalised offers by email.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">You can opt out of receiving these offers at any time.</p>
        <Link href="/account/preferences/marketing" className="text-xs font-semibold text-[#0F4C75] dark:text-blue-400 hover:underline mt-2 inline-block">
          Change marketing preferences &rsaquo;
        </Link>
      </div>
    </div>
  );
}
