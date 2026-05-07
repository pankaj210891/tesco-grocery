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
        // Clear user-specific stores — import lazily to avoid circular module refs
        import("@/store/wishlist.store").then(({ useWishlistStore }) =>
          useWishlistStore.getState().clearWishlist()
        );
        import("@/store/cart.store").then(({ useCartStore }) =>
          useCartStore.getState().clearCart()
        );
      },
    }),
    { name: "tesco-auth" }
  )
);
