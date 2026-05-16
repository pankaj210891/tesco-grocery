import { create } from "zustand";
import type { CartItem, SavedCartItem, Product } from "@/types";

export interface PromoInfo {
  label:          string;
  discountType:   "percentage" | "fixed" | "freeDelivery";
  discountValue:  number;
  discountAmount: number;
  minOrderValue:  number;
}

// ── Debounce map (module-level, persists across renders) ──────────────────────
const qtyDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

function debounceQtyUpdate(productId: string, fn: () => void, delay = 600) {
  const existing = qtyDebounceMap.get(productId);
  if (existing) clearTimeout(existing);
  qtyDebounceMap.set(productId, setTimeout(() => {
    qtyDebounceMap.delete(productId);
    fn();
  }, delay));
}

interface CartState {
  // ── Cart items ──────────────────────────────────────────────────────────────
  items:      CartItem[];
  totalItems: number;
  totalPrice: number;
  loading:    boolean;
  loaded:     boolean;

  // ── Saved-for-later ─────────────────────────────────────────────────────────
  savedItems:        SavedCartItem[];
  savedLoading:      boolean;
  savedLoaded:       boolean;

  // ── Promo ───────────────────────────────────────────────────────────────────
  promoCode:    string | null;
  promoInfo:    PromoInfo | null;
  setPromoCode: (code: string | null) => void;
  setPromoInfo: (info: PromoInfo | null) => void;
  clearPromo:   () => void;

  // ── Cart actions ────────────────────────────────────────────────────────────
  fetchCart:      (token: string) => Promise<void>;
  // token: string → syncs with server; token: null → guest local-only
  addItem:        (product: Product, quantity: number, token: string | null) => Promise<void>;
  removeItem:     (productId: string, token: string | null) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, token: string | null) => Promise<void>;
  clearCart:      (token: string) => Promise<void>;
  reset:          () => void;

  // ── Save-for-later actions ──────────────────────────────────────────────────
  fetchSavedItems: (token: string) => Promise<void>;
  saveForLater:    (productId: string, token: string) => Promise<void>;
  moveToCart:      (productId: string, token: string) => Promise<void>;
  removeSaved:     (productId: string, token: string) => Promise<void>;
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
  items:        [],
  totalItems:   0,
  totalPrice:   0,
  loading:      false,
  loaded:       false,

  savedItems:   [],
  savedLoading: false,
  savedLoaded:  false,

  promoCode:  null,
  promoInfo:  null,

  setPromoCode: (code) => set({ promoCode: code }),
  setPromoInfo: (info) => set({ promoInfo: info }),
  clearPromo:   ()     => set({ promoCode: null, promoInfo: null }),

  // ── Cart actions ────────────────────────────────────────────────────────────

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
      return { items, ...computeTotals(items), loaded: true };
    });

    if (!token) return;

    try {
      const res = await fetch("/api/account/cart", {
        method:  "POST",
        headers: AUTH(token),
        body:    JSON.stringify({ productId: product._id, quantity: newQty }),
      });
      if (res.ok) {
        const json = await res.json() as { success: boolean; data: CartItem[] };
        if (json.success) set({ items: json.data, ...computeTotals(json.data) });
      }
    } catch {
      // network error — optimistic state remains; reconciles on next fetchCart
    }
  },

  removeItem: async (productId, token) => {
    set((s) => {
      const items = s.items.filter((i) => i.product._id !== productId);
      return { items, ...computeTotals(items), loaded: true };
    });
    if (!token) return;
    try {
      await fetch(`/api/account/cart/${productId}`, { method: "DELETE", headers: AUTH(token) });
    } catch { /* network error */ }
  },

  updateQuantity: async (productId, quantity, token) => {
    if (quantity <= 0) { await get().removeItem(productId, token); return; }

    // Optimistic update immediately
    set((s) => {
      const items = s.items.map((i) => i.product._id === productId ? { ...i, quantity } : i);
      return { items, ...computeTotals(items), loaded: true };
    });

    if (!token) return;

    // Debounce the API call to batch rapid stepper clicks
    debounceQtyUpdate(productId, async () => {
      try {
        const res = await fetch("/api/account/cart", {
          method:  "POST",
          headers: AUTH(token),
          body:    JSON.stringify({ productId, quantity: get().items.find((i) => i.product._id === productId)?.quantity ?? quantity }),
        });
        if (res.ok) {
          const json = await res.json() as { success: boolean; data: CartItem[] };
          if (json.success) set({ items: json.data, ...computeTotals(json.data) });
        }
      } catch { /* network error */ }
    });
  },

  clearCart: async (token) => {
    set({ items: [], totalItems: 0, totalPrice: 0, promoCode: null, promoInfo: null });
    await fetch("/api/account/cart", { method: "DELETE", headers: AUTH(token) });
  },

  reset: () => set({
    items:        [],
    totalItems:   0,
    totalPrice:   0,
    loading:      false,
    loaded:       false,
    savedItems:   [],
    savedLoading: false,
    savedLoaded:  false,
    promoCode:    null,
    promoInfo:    null,
  }),

  // ── Save-for-later actions ──────────────────────────────────────────────────

  fetchSavedItems: async (token) => {
    set({ savedLoading: true });
    try {
      const res  = await fetch("/api/account/cart/save-for-later", { headers: AUTH(token) });
      const json = await res.json() as { success: boolean; data: SavedCartItem[] };
      if (json.success) set({ savedItems: json.data });
    } finally {
      set({ savedLoading: false, savedLoaded: true });
    }
  },

  saveForLater: async (productId, token) => {
    // Optimistic: remove from items, add to savedItems
    const item = get().items.find((i) => i.product._id === productId);
    if (!item) return;

    set((s) => {
      const items = s.items.filter((i) => i.product._id !== productId);
      const alreadySaved = s.savedItems.some((si) => si.product._id === productId);
      const savedItems = alreadySaved
        ? s.savedItems
        : [...s.savedItems, { product: item.product, savedAt: new Date().toISOString() }];
      return { items, ...computeTotals(items), savedItems };
    });

    try {
      const res  = await fetch("/api/account/cart/save-for-later", {
        method:  "POST",
        headers: AUTH(token),
        body:    JSON.stringify({ productId }),
      });
      const json = await res.json() as { success: boolean; data: SavedCartItem[] };
      if (json.success) set({ savedItems: json.data });
    } catch { /* network error — optimistic state remains */ }
  },

  moveToCart: async (productId, token) => {
    // Optimistic: remove from savedItems, add to cart items
    const saved = get().savedItems.find((si) => si.product._id === productId);
    if (!saved) return;

    set((s) => {
      const savedItems = s.savedItems.filter((si) => si.product._id !== productId);
      const existing   = s.items.find((i) => i.product._id === productId);
      const items = existing
        ? s.items.map((i) => i.product._id === productId ? { ...i, quantity: i.quantity + 1 } : i)
        : [...s.items, { product: saved.product, quantity: 1 }];
      return { items, ...computeTotals(items), savedItems };
    });

    try {
      const res  = await fetch("/api/account/cart/move-to-cart", {
        method:  "POST",
        headers: AUTH(token),
        body:    JSON.stringify({ productId }),
      });
      const json = await res.json() as { success: boolean; data: CartItem[] };
      if (json.success) set({ items: json.data, ...computeTotals(json.data) });
    } catch { /* network error */ }
  },

  removeSaved: async (productId, token) => {
    set((s) => ({ savedItems: s.savedItems.filter((si) => si.product._id !== productId) }));
    try {
      await fetch(`/api/account/cart/saved/${productId}`, { method: "DELETE", headers: AUTH(token) });
    } catch { /* network error */ }
  },
}));
