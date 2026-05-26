"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import type { UserRole } from "@/types";

interface AuthGuardProps {
  roles: UserRole[];
  children: React.ReactNode;
}

export default function AuthGuard({ roles, children }: AuthGuardProps) {
  const { user, hasHydrated } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user) { router.push(`/login?redirect=${encodeURIComponent(pathname)}`); return; }
    if (!roles.includes(user.role)) { router.push("/"); }
  }, [hasHydrated, user, router, roles, pathname]);

  if (!hasHydrated) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
      </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="h-8 w-8 rounded-full border-2 border-gray-300 border-t-gray-700 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
