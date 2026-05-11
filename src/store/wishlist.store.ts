import { create } from "zustand";
import type { Product } from "@/types";

interface WishlistState {
  items:   Product[];
  loading: boolean;
  loaded:  boolean;

  fetchWishlist: (token: string) => Promise<void>;
  toggleItem:    (product: Product, token: string) => Promise<void>;
  hasItem:       (productId: string) => boolean;
  reset:         () => void;
}

const AUTH = (token: string) => ({ Authorization: `Bearer ${token}` });

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  items:   [],
  loading: false,
  loaded:  false,

  fetchWishlist: async (token) => {
    set({ loading: true });
    try {
      const res  = await fetch("/api/account/wishlist", { headers: AUTH(token) });
      const json = await res.json() as { data: Product[] };
      if (Array.isArray(json.data)) set({ items: json.data, loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  toggleItem: async (product, token) => {
    const saved = get().hasItem(product._id);
    // Optimistic
    set((s) => ({
      items: saved
        ? s.items.filter((i) => i._id !== product._id)
        : [...s.items, product],
    }));
    // Persist
    if (saved) {
      await fetch(`/api/account/wishlist/${product._id}`, {
        method: "DELETE",
        headers: AUTH(token),
      });
    } else {
      await fetch("/api/account/wishlist", {
        method: "POST",
        headers: { ...AUTH(token), "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product._id }),
      });
    }
  },

  hasItem: (productId) => get().items.some((i) => i._id === productId),

  reset: () => set({ items: [], loading: false, loaded: false }),
}));
