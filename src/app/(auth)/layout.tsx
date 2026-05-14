import Link from "next/link";
import { Store } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Minimal header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#FCA311" }}>
              <Store className="h-4 w-4 text-white" aria-hidden />
            </div>
            <div className="leading-none">
              <span className="font-black text-lg tracking-tight text-gray-900 dark:text-white">Prakash</span>
              <span className="text-gray-500 dark:text-gray-400 text-xs font-medium block">Supermarket</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700">
        © {new Date().getFullYear()} Prakash Supermarket Ltd. All rights reserved.
      </footer>
    </div>
  );
}
