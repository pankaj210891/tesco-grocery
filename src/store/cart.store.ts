import { create } from "zustand";
import { authClient } from "@/lib/axios";
import type { CartItem, SavedCartItem, Product, ProductVariant } from "@/types";

export interface PromoInfo {
  label:          string;
  discountType:   "percentage" | "fixed" | "freeDelivery";
  discountValue:  number;
  discountAmount: number;
  minOrderValue:  number;
}

// Stable composite key for a cart slot (productId + optional variantId)
function slotKey(productId: string, variantId?: string | null): string {
  return `${productId}:${variantId ?? ""}`;
}

// ── Debounce map keyed by slot (productId:variantId) ─────────────────────────
const qtyDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();

function debounceQtyUpdate(key: string, fn: () => void, delay = 600) {
  const existing = qtyDebounceMap.get(key);
  if (existing) clearTimeout(existing);
  qtyDebounceMap.set(key, setTimeout(() => {
    qtyDebounceMap.delete(key);
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
  addItem:        (product: Product, quantity: number, token: string | null, selectedVariant?: ProductVariant | null) => Promise<void>;
  removeItem:     (productId: string, variantId: string | null, token: string | null) => Promise<void>;
  updateQuantity: (productId: string, variantId: string | null, quantity: number, token: string | null) => Promise<void>;
  clearCart:      (token: string | null) => Promise<void>;
  reset:          () => void;

  // ── Save-for-later actions ──────────────────────────────────────────────────
  fetchSavedItems: (token: string) => Promise<void>;
  saveForLater:    (productId: string, variantId: string | null, token: string) => Promise<void>;
  moveToCart:      (productId: string, token: string) => Promise<void>;
  removeSaved:     (productId: string, token: string) => Promise<void>;
}

function effectiveItemPrice(item: CartItem): number {
  return item.selectedVariant?.price != null ? item.selectedVariant.price : item.product.price;
}

function computeTotals(items: CartItem[]) {
  return {
    totalItems: items.reduce((s, i) => s + i.quantity, 0),
    totalPrice: items.reduce((s, i) => s + effectiveItemPrice(i) * i.quantity, 0),
  };
}


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
      const res = await authClient(token).get<{ success: boolean; data: CartItem[] }>("/api/account/cart");
      if (res.data.success) set({ items: res.data.data, ...computeTotals(res.data.data) });
    } finally {
      set({ loading: false, loaded: true });
    }
  },

  addItem: async (product, quantity, token, selectedVariant) => {
    const variantId = selectedVariant?._id ?? null;
    const key       = slotKey(product._id, variantId);

    const existing = get().items.find((i) => slotKey(i.product._id, i.variantId) === key);
    const newQty   = (existing?.quantity ?? 0) + quantity;

    set((s) => {
      const items = existing
        ? s.items.map((i) =>
            slotKey(i.product._id, i.variantId) === key ? { ...i, quantity: newQty } : i
          )
        : [...s.items, { product, quantity: newQty, variantId, selectedVariant: selectedVariant ?? undefined }];
      return { items, ...computeTotals(items), loaded: true };
    });

    if (!token) return;

    try {
      const res = await authClient(token).post<{ success: boolean; data: CartItem[] }>(
        "/api/account/cart",
        { productId: product._id, variantId, quantity: newQty }
      );
      if (res.data.success) set({ items: res.data.data, ...computeTotals(res.data.data) });
    } catch {
      // network error — optimistic state remains; reconciles on next fetchCart
    }
  },

  removeItem: async (productId, variantId, token) => {
    const key = slotKey(productId, variantId);
    set((s) => {
      const items = s.items.filter((i) => slotKey(i.product._id, i.variantId) !== key);
      return { items, ...computeTotals(items), loaded: true };
    });
    if (!token) return;
    try {
      const url = variantId
        ? `/api/account/cart/${productId}?variantId=${encodeURIComponent(variantId)}`
        : `/api/account/cart/${productId}`;
      await authClient(token).delete(url);
    } catch { /* network error */ }
  },

  updateQuantity: async (productId, variantId, quantity, token) => {
    if (quantity <= 0) { await get().removeItem(productId, variantId, token); return; }

    const key = slotKey(productId, variantId);

    set((s) => {
      const items = s.items.map((i) =>
        slotKey(i.product._id, i.variantId) === key ? { ...i, quantity } : i
      );
      return { items, ...computeTotals(items), loaded: true };
    });

    if (!token) return;

    debounceQtyUpdate(key, async () => {
      try {
        const currentQty = get().items.find((i) => slotKey(i.product._id, i.variantId) === key)?.quantity ?? quantity;
        const res = await authClient(token!).post<{ success: boolean; data: CartItem[] }>(
          "/api/account/cart",
          { productId, variantId, quantity: currentQty }
        );
        if (res.data.success) set({ items: res.data.data, ...computeTotals(res.data.data) });
      } catch { /* network error */ }
    });
  },

  clearCart: async (token) => {
    set({ items: [], totalItems: 0, totalPrice: 0, promoCode: null, promoInfo: null });
    if (token) {
      await authClient(token).delete("/api/account/cart");
    }
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
      const res = await authClient(token).get<{ success: boolean; data: SavedCartItem[] }>("/api/account/cart/save-for-later");
      if (res.data.success) set({ savedItems: res.data.data });
    } finally {
      set({ savedLoading: false, savedLoaded: true });
    }
  },

  saveForLater: async (productId, variantId, token) => {
    const key  = slotKey(productId, variantId);
    const item = get().items.find((i) => slotKey(i.product._id, i.variantId) === key);
    if (!item) return;

    set((s) => {
      const items = s.items.filter((i) => slotKey(i.product._id, i.variantId) !== key);
      const alreadySaved = s.savedItems.some((si) => si.product._id === productId);
      const savedItems   = alreadySaved
        ? s.savedItems
        : [...s.savedItems, { product: item.product, savedAt: new Date().toISOString() }];
      return { items, ...computeTotals(items), savedItems };
    });

    try {
      const res = await authClient(token).post<{ success: boolean; data: SavedCartItem[] }>(
        "/api/account/cart/save-for-later",
        { productId, variantId }
      );
      if (res.data.success) set({ savedItems: res.data.data });
    } catch { /* network error — optimistic state remains */ }
  },

  moveToCart: async (productId, token) => {
    const saved = get().savedItems.find((si) => si.product._id === productId);
    if (!saved) return;

    // Move base product (no variant) back — user can pick variant on product page
    const baseKey  = slotKey(productId, null);
    set((s) => {
      const savedItems = s.savedItems.filter((si) => si.product._id !== productId);
      const existing   = s.items.find((i) => slotKey(i.product._id, i.variantId) === baseKey);
      const items = existing
        ? s.items.map((i) => slotKey(i.product._id, i.variantId) === baseKey ? { ...i, quantity: i.quantity + 1 } : i)
        : [...s.items, { product: saved.product, quantity: 1, variantId: null }];
      return { items, ...computeTotals(items), savedItems };
    });

    try {
      const res = await authClient(token).post<{ success: boolean; data: CartItem[] }>(
        "/api/account/cart/move-to-cart",
        { productId }
      );
      if (res.data.success) set({ items: res.data.data, ...computeTotals(res.data.data) });
    } catch { /* network error */ }
  },

  removeSaved: async (productId, token) => {
    set((s) => ({ savedItems: s.savedItems.filter((si) => si.product._id !== productId) }));
    try {
      await authClient(token).delete(`/api/account/cart/saved/${productId}`);
    } catch { /* network error */ }
  },
}));
