import { create } from "zustand";
import type { CartItem, Product } from "@/types";

// ─── PromoInfo is populated by the server — never computed on the client ──────

export interface PromoInfo {
  label:          string;
  discountType:   "percentage" | "fixed" | "freeDelivery";
  discountValue:  number;  // e.g. 20 for 20%, 10 for £10, 0 for freeDelivery
  discountAmount: number;  // backend-calculated absolute saving in £
  minOrderValue:  number;
}

interface CartState {
  items:      CartItem[];
  totalItems: number;
  totalPrice: number;
  loading:    boolean;
  loaded:     boolean;

  /* Promo state — survives cart → checkout navigation */
  promoCode:    string | null;
  promoInfo:    PromoInfo | null;
  setPromoCode: (code: string | null) => void;
  setPromoInfo: (info: PromoInfo | null) => void;
  clearPromo:   () => void;

  fetchCart:      (token: string) => Promise<void>;
  addItem:        (product: Product, quantity: number, token: string) => Promise<void>;
  removeItem:     (productId: string, token: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, token: string) => Promise<void>;
  clearCart:      (token: string) => Promise<void>;
  reset:          () => void;
}

function computeTotals(items: CartItem[]) {
  return {
    totalItems: items.reduce((s, i) => s + i.quantity, 0),
    totalPrice: items.reduce((s, i) => s + i.product.price * i.quantity, 0),
  };
}

const AUTH = (token: string) => ({
  "Content-Type": "application/json",
  Authorization:  `Bearer ${token}`,
});

export const useCartStore = create<CartState>()((set, get) => ({
  items:      [],
  totalItems: 0,
  totalPrice: 0,
  loading:    false,
  loaded:     false,
  promoCode:  null,
  promoInfo:  null,

  setPromoCode: (code) => set({ promoCode: code }),
  setPromoInfo: (info) => set({ promoInfo: info }),
  clearPromo:   ()     => set({ promoCode: null, promoInfo: null }),

  fetchCart: async (token) => {
    set({ loading: true });
    try {
      const res  = await fetch("/api/account/cart", { headers: AUTH(token) });
      const json = await res.json() as { success: boolean; data: CartItem[] };
      if (json.success) set({ items: json.data, ...computeTotals(json.data) });
    } finally {
      set({ loading: false, loaded: true });
    }
  },

  addItem: async (product, quantity, token) => {
    const existing = get().items.find((i) => i.product._id === product._id);
    const newQty   = (existing?.quantity ?? 0) + quantity;
    set((s) => {
      const items = existing
        ? s.items.map((i) => i.product._id === product._id ? { ...i, quantity: newQty } : i)
        : [...s.items, { product, quantity: newQty }];
      return { items, ...computeTotals(items) };
    });
    await fetch("/api/account/cart", {
      method:  "POST",
      headers: AUTH(token),
      body:    JSON.stringify({ productId: product._id, quantity: newQty }),
    });
  },

  removeItem: async (productId, token) => {
    set((s) => {
      const items = s.items.filter((i) => i.product._id !== productId);
      return { items, ...computeTotals(items) };
    });
    await fetch(`/api/account/cart/${productId}`, { method: "DELETE", headers: AUTH(token) });
  },

  updateQuantity: async (productId, quantity, token) => {
    if (quantity <= 0) { await get().removeItem(productId, token); return; }
    set((s) => {
      const items = s.items.map((i) => i.product._id === productId ? { ...i, quantity } : i);
      return { items, ...computeTotals(items) };
    });
    await fetch("/api/account/cart", {
      method:  "POST",
      headers: AUTH(token),
      body:    JSON.stringify({ productId, quantity }),
    });
  },

  clearCart: async (token) => {
    set({ items: [], totalItems: 0, totalPrice: 0, promoCode: null, promoInfo: null });
    await fetch("/api/account/cart", { method: "DELETE", headers: AUTH(token) });
  },

  reset: () => set({
    items:      [],
    totalItems: 0,
    totalPrice: 0,
    loading:    false,
    loaded:     false,
    promoCode:  null,
    promoInfo:  null,
  }),
}));
