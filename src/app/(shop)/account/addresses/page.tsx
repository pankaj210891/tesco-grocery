"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useHydrated } from "@/hooks/useHydrated";
import AddressSection from "@/components/account/AddressSection";

export default function AddressesPage() {
  const router   = useRouter();
  const hydrated = useHydrated();
  const { user } = useAuthStore();

  useEffect(() => {
    if (hydrated && !user) {
      router.replace("/login?redirect=/account/addresses");
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-36 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/account"
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Back to account"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          Account
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-[#FCA311]" aria-hidden />
          <h1 className="text-xl font-black text-gray-900 dark:text-white">Saved Addresses</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 p-5 sm:p-6">
        <AddressSection />
      </div>
    </div>
  );
}
