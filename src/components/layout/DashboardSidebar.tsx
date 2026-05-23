"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X, LucideIcon } from "lucide-react";
import { useState } from "react";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/store/auth.store";
import { siteConfig } from "@/config/site";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export type SidebarVariant = "admin" | "vendor";

export interface DashboardSidebarProps {
  variant: SidebarVariant;
  panelTitle: string;
  nav: NavItem[];
  rootHref: string;
}

// Static map keeps Tailwind from purging these classes
const VARIANT = {
  admin:  { bg: "bg-[#0F1B2D]", active: "bg-[#0F4C75]" },
  vendor: { bg: "bg-[#0d2b1a]", active: "bg-[#1a7a4a]" },
} as const satisfies Record<SidebarVariant, { bg: string; active: string }>;

interface NavLinksProps {
  pathname: string;
  onClose: () => void;
  nav: NavItem[];
  rootHref: string;
  activeClass: string;
}

function NavLinks({ pathname, onClose, nav, rootHref, activeClass }: NavLinksProps) {
  return (
    <>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== rootHref && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
              active ? `${activeClass} text-white` : "text-gray-300 hover:bg-white/10 hover:text-white"
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

export default function DashboardSidebar({ variant, panelTitle, nav, rootHref }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  useScrollLock(open);

  const { bg, active } = VARIANT[variant];

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const logoutButton = (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
    >
      <LogOut className="h-4 w-4" /> Logout
    </button>
  );

  const navLinks = (onClose: () => void) => (
    <NavLinks
      pathname={pathname}
      onClose={onClose}
      nav={nav}
      rootHref={rootHref}
      activeClass={active}
    />
  );

  return (
    <>
      {/* Mobile topbar */}
      <div className={cn("lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/10", bg)}>
        <span className="text-white font-bold text-sm">{panelTitle}</span>
        <button onClick={() => setOpen(!open)} className="text-white">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className={cn("w-64 flex flex-col h-full", bg)}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 pt-4 pb-2">
              {panelTitle}
            </p>
            <nav className="flex-1 overflow-y-auto px-4 py-1 space-y-0.5">
              {navLinks(() => setOpen(false))}
            </nav>
            <div className="shrink-0 px-4 py-4 border-t border-white/10 space-y-1">
              {logoutButton}
            </div>
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn("hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0", bg)}>
        <div className="shrink-0 px-4 py-4 mb-1">
          <p className="text-white font-black text-base tracking-tight">{siteConfig.shortName}</p>
          <p className="text-xs text-gray-400 font-medium">{panelTitle}</p>
        </div>
        <p className="shrink-0 text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-4 mb-1">
          Navigation
        </p>
        <nav className="flex-1 overflow-y-auto px-4 py-1 space-y-0.5 scrollbar-none">
          {navLinks(() => {})}
        </nav>
        <div className="shrink-0 px-4 py-4 border-t border-white/10 space-y-1">
          {logoutButton}
        </div>
      </aside>
    </>
  );
}
