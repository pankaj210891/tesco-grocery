import Link from "next/link";
import { Store } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-[#0F4C75] rounded-lg px-2 py-1 flex items-center gap-1.5">
              <Store className="h-4 w-4 text-[#F57C00]" aria-hidden />
              <span className="text-white font-black text-sm tracking-tight leading-none">
                Prakash
              </span>
            </div>
            <span className="font-semibold text-gray-600 text-sm hidden sm:inline">
              Supermarket
            </span>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} Prakash Supermarket Ltd. All rights reserved.
      </footer>
    </div>
  );
}
