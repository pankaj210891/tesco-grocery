"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

// Destination dashboard for each privileged role.
// Roles not listed here (i.e. "customer") pass through unchanged.
const ROLE_DASHBOARDS: Partial<Record<string, string>> = {
  admin:  "/admin",
  vendor: "/vendor",
};

/**
 * Wraps the shop (customer) layout and redirects admin / vendor users to
 * their respective dashboards before anything is painted.
 *
 * Renders null until the Zustand store has rehydrated so there is no flash
 * of shop content for privileged users.
 */
export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const { user, hasHydrated } = useAuthStore();
  const router = useRouter();

  const redirectTo = user ? (ROLE_DASHBOARDS[user.role] ?? null) : null;

  useEffect(() => {
    if (!hasHydrated || !redirectTo) return;
    router.replace(redirectTo);
  }, [hasHydrated, redirectTo, router]);

  // Hide everything until we know the user's role:
  //   • pre-hydration  → show nothing (avoids SSR/client mismatch flash)
  //   • redirect pending → show nothing (avoids shop content flicker)
  if (!hasHydrated || redirectTo) return null;

  return <>{children}</>;
}
