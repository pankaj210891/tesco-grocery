"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center space-y-6">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-7 w-7 text-red-500" aria-hidden />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-black text-gray-900">Something went wrong</h1>
              <p className="text-sm text-gray-500 leading-relaxed">
                An unexpected error occurred. Our team has been notified.
              </p>
              {error.digest && (
                <p className="text-xs text-gray-400 font-mono">Error ID: {error.digest}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#FCA311] hover:brightness-105 text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors"
              >
                <Home className="h-4 w-4" aria-hidden />
                Go home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
