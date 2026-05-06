import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/types";

interface WishlistState {
  items: Product[];
  toggleItem:    (product: Product) => void;
  removeItem:    (productId: string) => void;
  hasItem:       (productId: string) => boolean;
  clearWishlist: () => void;
  setItems:      (products: Product[]) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      toggleItem: (product) =>
        set((state) =>
          state.items.some((i) => i._id === product._id)
            ? { items: state.items.filter((i) => i._id !== product._id) }
            : { items: [...state.items, product] }
        ),

      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i._id !== productId) })),

      hasItem: (productId) => get().items.some((i) => i._id === productId),

      clearWishlist: () => set({ items: [] }),

      setItems: (products) => set({ items: products }),
    }),
    { name: "tesco-wishlist" }
  )
);
