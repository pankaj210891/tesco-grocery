import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@/types";

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

function computeTotals(items: CartItem[]) {
  return {
    totalItems: items.reduce((sum, i) => sum + i.quantity, 0),
    totalPrice: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      totalItems: 0,
      totalPrice: 0,

      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.product._id === product._id
          );
          const items = existing
            ? state.items.map((i) =>
                i.product._id === product._id
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              )
            : [...state.items, { product, quantity }];
          return { items, ...computeTotals(items) };
        }),

      removeItem: (productId) =>
        set((state) => {
          const items = state.items.filter(
            (i) => i.product._id !== productId
          );
          return { items, ...computeTotals(items) };
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          const items =
            quantity <= 0
              ? state.items.filter((i) => i.product._id !== productId)
              : state.items.map((i) =>
                  i.product._id === productId ? { ...i, quantity } : i
                );
          return { items, ...computeTotals(items) };
        }),

      clearCart: () =>
        set({ items: [], totalItems: 0, totalPrice: 0 }),
    }),
    {
      name: "prakash-cart",
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const totals = computeTotals(state.items);
          state.totalItems = totals.totalItems;
          state.totalPrice = totals.totalPrice;
        }
      },
    }
  )
);
