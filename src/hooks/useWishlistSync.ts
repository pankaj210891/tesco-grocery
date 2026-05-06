"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useHydrated } from "@/hooks/useHydrated";
import type { Product } from "@/types";

/**
 * Called once per user session (tracked by syncedUserId ref).
 * Merges local wishlist into the server, then merges the server result back
 * into the local store — preserving any items added while the request was in-flight.
 *
 * Uses getState() instead of hook subscription to avoid:
 *   1. Stale closure over `items` at effect-run time
 *   2. Wiring the Navbar to re-render on every wishlist change
 */
export function useWishlistSync() {
  const hydrated = useHydrated();
  const { user, token } = useAuthStore();
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !user || !token) {
      syncedUserId.current = null;
      return;
    }
    if (syncedUserId.current === user._id) return;

    // Read live state — not the stale closure value
    const localIds = useWishlistStore.getState().items.map((i) => i._id);

    axios
      .put(
        "/api/account/wishlist/sync",
        { productIds: localIds },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(({ data: json }) => {
        if (json?.data) {
          // Read live state again — user may have added items while request was in-flight
          const currentItems = useWishlistStore.getState().items;
          const serverIds    = new Set((json.data as Product[]).map((p) => p._id));
          const localOnly    = currentItems.filter((p) => !serverIds.has(p._id));
          // Merge: server items first (fresh data), then any locally added items
          useWishlistStore.getState().setItems([...json.data, ...localOnly]);
        }
        syncedUserId.current = user._id;
      })
      .catch(() => {
        syncedUserId.current = user._id;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?._id, token]);
}
