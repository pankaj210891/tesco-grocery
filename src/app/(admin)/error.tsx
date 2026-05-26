"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AdminError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="h-7 w-7 text-red-500 dark:text-red-400" aria-hidden />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
            Admin panel error
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            An error occurred loading this admin section. Try refreshing or go back to the dashboard.
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 font-mono">Ref: {error.digest}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0F4C75] hover:brightness-110 text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
