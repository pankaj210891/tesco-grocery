"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { useWishlistStore } from "@/store/wishlist.store";

/**
 * Fetches cart and wishlist from the server once per user session.
 * Resets both stores when the user logs out.
 * Must be called in a single top-level client component (e.g. Navbar).
 */
export function useAuthData() {
  const { user, token, hasHydrated } = useAuthStore();
  const cartLoaded     = useCartStore((s) => s.loaded);
  const wishlistLoaded = useWishlistStore((s) => s.loaded);
  const fetchCart      = useCartStore((s) => s.fetchCart);
  const fetchWishlist  = useWishlistStore((s) => s.fetchWishlist);
  const resetCart      = useCartStore((s) => s.reset);
  const resetWishlist  = useWishlistStore((s) => s.reset);
  const loadedFor      = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user || !token) {
      if (loadedFor.current) {
        resetCart();
        resetWishlist();
        loadedFor.current = null;
      }
      return;
    }

    if (loadedFor.current === user._id) return;
    loadedFor.current = user._id;

    // Only fetch if not already loaded in this session
    if (!cartLoaded)     void fetchCart(token);
    if (!wishlistLoaded) void fetchWishlist(token);
  }, [hasHydrated, user, token, cartLoaded, wishlistLoaded, fetchCart, fetchWishlist, resetCart, resetWishlist]);
}
