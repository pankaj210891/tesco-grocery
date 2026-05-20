"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiClient } from "@/lib/axios";
import type { User } from "@/types";

interface AuthState {
  user:           User | null;
  token:          string | null;
  hasHydrated:    boolean;
  setAuth:        (user: User, token: string) => void;
  logout:         () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:           null,
      token:          null,
      hasHydrated:    false,
      setAuth:        (user, token) => set({ user, token }),
      logout: () => {
        // Fire-and-forget: clear the httpOnly auth cookie set by the login API.
        // Failure is acceptable — the cookie expires naturally after 7 days.
        void apiClient.post("/api/auth/logout");
        set({ user: null, token: null });
      },
      setHasHydrated: (v) => set({ hasHydrated: v }),
      // Cart and wishlist are intentionally kept on logout:
      // - Cart is device-local (guest should be able to check out after login).
      // - Wishlist local state is overwritten by the server's copy on next login
      //   via useWishlistSync, so no stale data leaks across users.
    }),
    {
      name: "prakash-auth",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
