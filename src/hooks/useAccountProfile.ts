"use client";

import { useState, useEffect, useCallback } from "react";
import { authClient } from "@/lib/axios";
import { useAuthStore } from "@/store/auth.store";
import type { AccountProfile } from "@/types";

interface UseAccountProfileReturn {
  profile:  AccountProfile | null;
  loading:  boolean;
  error:    string | null;
  refresh:  () => void;
}

export function useAccountProfile(): UseAccountProfileReturn {
  const { token } = useAuthStore();
  const [profile,    setProfile]    = useState<AccountProfile | null>(null);
  const [loading,    setLoading]    = useState(() => !!token);
  const [error,      setError]      = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const client = authClient(token!);
        const { data: json } = await client.get<{ data: AccountProfile }>("/api/account/profile");
        if (!cancelled) {
          setProfile(json.data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [token, refreshKey]);

  return { profile, loading, error, refresh };
}
