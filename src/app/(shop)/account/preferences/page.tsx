"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Leaf, Mail, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";

const PREFERENCE_ITEMS = [
  {
    Icon:        Leaf,
    label:       "Dietary preferences",
    description: "Tell us your dietary needs so we can personalise your experience.",
    href:        "/account/preferences/dietary",
    iconBg:      "bg-green-50 dark:bg-green-900/20",
    iconColor:   "text-green-600 dark:text-green-400",
  },
  {
    Icon:        Mail,
    label:       "Marketing preferences",
    description: "Choose how you'd like to hear about offers, news and personalised content.",
    href:        "/account/preferences/marketing",
    iconBg:      "bg-blue-50 dark:bg-blue-900/20",
    iconColor:   "text-[#0F4C75] dark:text-blue-400",
  },
] as const;

export default function PreferencesPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user } = useAuthStore();

  useEffect(() => {
    if (hydrated && !user) router.replace("/login?redirect=/account/preferences");
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20">
        <div className="animate-pulse space-y-4">
          {[1, 2].map((n) => <div key={n} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 pb-20">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
        <Link href="/account" className="hover:text-[#0F4C75] dark:hover:text-blue-400 transition-colors">
          My account
        </Link>
        <span aria-hidden>/</span>
        <span className="text-gray-800 dark:text-white font-medium">Preferences</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/account"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back to account"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden />
        </Link>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">Preferences</h1>
      </div>

      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 divide-y divide-gray-100 dark:divide-gray-700/60">
        {PREFERENCE_ITEMS.map(({ Icon, label, description, href, iconBg, iconColor }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
          >
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-[#0F4C75] dark:group-hover:text-blue-400 transition-colors shrink-0" aria-hidden />
          </Link>
        ))}
      </div>
    </div>
  );
}
