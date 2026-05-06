import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Minimal header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#00539F] rounded flex items-center justify-center">
              <span className="text-white font-black text-sm">T</span>
            </div>
            <span className="font-black text-gray-900 text-lg">Tesco</span>
          </Link>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-400 border-t border-gray-100">
        © {new Date().getFullYear()} Tesco Stores Ltd. All rights reserved.
      </footer>
    </div>
  );
}
