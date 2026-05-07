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
      logout: () => {
        set({ user: null, token: null });
        // Wishlist is user-specific and DB-backed — clear it on sign-out.
        // Cart is intentionally kept: device-local, not account-tied.
        import("@/store/wishlist.store").then(({ useWishlistStore }) =>
          useWishlistStore.getState().clearWishlist()
        );
      },
    }),
    { name: "tesco-auth" }
  )
);
