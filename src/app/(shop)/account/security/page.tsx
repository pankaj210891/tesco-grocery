"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Smartphone, Shield, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";

const SECURITY_ITEMS = [
  {
    Icon:        Lock,
    label:       "Change password",
    description: "Update your account password. You can't reuse a previous password.",
    href:        "/account/security/change-password",
    cta:         "Change",
  },
  {
    Icon:        Smartphone,
    label:       "Mobile number",
    description: "Add or update your mobile number for order alerts and account security.",
    href:        "/account/profile",
    cta:         "Update",
  },
] as const;

export default function SecurityPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user } = useAuthStore();

  useEffect(() => {
    if (hydrated && !user) router.replace("/login?redirect=/account/security");
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
        <span className="text-gray-800 dark:text-white font-medium">Security and password</span>
      </nav>

      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/account"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label="Back to account"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" aria-hidden />
        </Link>
        <h1 className="text-xl font-black text-gray-900 dark:text-white">Security and password</h1>
      </div>

      {/* Intro banner */}
      <div className="flex items-center gap-3 p-4 mb-5 bg-[#0F4C75]/5 dark:bg-blue-900/10 border border-[#0F4C75]/20 dark:border-blue-800/30 rounded-xl">
        <Shield className="h-5 w-5 text-[#0F4C75] dark:text-blue-400 shrink-0" aria-hidden />
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Keep your account safe by using a strong password and a verified mobile number.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 divide-y divide-gray-100 dark:divide-gray-700/60">
        {SECURITY_ITEMS.map(({ Icon, label, description, href, cta }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0F4C75]/8 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-[#0F4C75] dark:text-blue-400" aria-hidden />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
            </div>
            <span className="flex items-center gap-1 text-xs font-semibold text-[#0F4C75] dark:text-blue-400 shrink-0 group-hover:underline">
              {cta}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
