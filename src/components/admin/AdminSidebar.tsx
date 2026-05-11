"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package, ShoppingBag, Users, Store,
  ArrowLeft, LogOut, Menu, X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/store/auth.store";

const NAV = [
  { href: "/admin",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products",  icon: Package },
  { href: "/admin/orders",   label: "Orders",    icon: ShoppingBag },
  { href: "/admin/users",    label: "Users",     icon: Users },
  { href: "/admin/vendors",  label: "Vendors",   icon: Store },
];

interface NavLinksProps { pathname: string; onClose: () => void; }

function NavLinks({ pathname, onClose }: NavLinksProps) {
  return (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-[#0F4C75] text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { logout } = useAuthStore();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <>
      {/* Mobile topbar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[#0F1B2D] border-b border-white/10">
        <span className="text-white font-bold text-sm">Prakash Admin</span>
        <button onClick={() => setOpen(!open)} className="text-white">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-[#0F1B2D] flex flex-col p-4 gap-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-2">Admin Panel</p>
            <NavLinks pathname={pathname} onClose={() => setOpen(false)} />
            <div className="mt-auto pt-4 border-t border-white/10 space-y-1">
              <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                <ArrowLeft className="h-4 w-4" /> Back to Shop
              </Link>
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-[#0F1B2D] min-h-screen p-4 gap-1">
        <div className="px-4 py-3 mb-2">
          <p className="text-white font-black text-base tracking-tight">Prakash</p>
          <p className="text-xs text-gray-400 font-medium">Admin Panel</p>
        </div>
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 mb-1">Navigation</p>
        <NavLinks pathname={pathname} onClose={() => setOpen(false)} />
        <div className="mt-auto pt-4 border-t border-white/10 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Shop
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
