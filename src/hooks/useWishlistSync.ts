"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
import { useAuthStore } from "@/store/auth.store";
import { useWishlistStore } from "@/store/wishlist.store";
import { useHydrated } from "@/hooks/useHydrated";

/**
 * Called once per user session (tracked by syncedUserId ref).
 * Merges local wishlist into the server, then replaces the local store
 * with the merged result — so the user sees the same wishlist on every device.
 */
export function useWishlistSync() {
  const hydrated = useHydrated();
  const { user, token } = useAuthStore();
  const { items, setItems } = useWishlistStore();
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated || !user || !token) {
      syncedUserId.current = null;
      return;
    }
    if (syncedUserId.current === user._id) return;

    const localIds = items.map((i) => i._id);

    axios
      .put(
        "/api/account/wishlist/sync",
        { productIds: localIds },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(({ data: json }) => {
        if (json?.data) setItems(json.data);
        syncedUserId.current = user._id;
      })
      .catch(() => {
        syncedUserId.current = user._id;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user?._id, token]);
}
