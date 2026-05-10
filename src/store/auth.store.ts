"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  user:    User | null;
  token:   string | null;
  setAuth: (user: User, token: string) => void;
  logout:  () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:    null,
      token:   null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null }),
      // Cart and wishlist are intentionally kept on logout:
      // - Cart is device-local (guest should be able to check out after login).
      // - Wishlist local state is overwritten by the server's copy on next login
      //   via useWishlistSync, so no stale data leaks across users.
    }),
    { name: "prakash-auth" }
  )
);
