"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export interface UseAdminFiltersConfig<F extends Record<string, string>> {
  defaultFilters: F;
  buildQS:        (filters: F, page: number) => URLSearchParams;
  setFilter:      (partial: Partial<F>) => void;
  setPage:        (page: number) => void;
  filters:        F;
  page:           number;
}

/**
 * Encapsulates the three repeated patterns on every paginated admin list page:
 *  1. Auth guard — redirects unauthenticated / non-admin visitors.
 *  2. URL → store sync on mount — reads current query-string into the store so
 *     the user can share/bookmark filtered URLs.
 *  3. Store → URL sync — keeps the address bar in sync as filters change.
 *
 * Returns `filterReady` which is `true` once the URL→store sync completes.
 * Use it to gate data-fetching effects so the first request uses the correct
 * filter values rather than the empty store defaults.
 */
export function useAdminFilters<F extends Record<string, string>>({
  defaultFilters,
  buildQS,
  setFilter,
  setPage,
  filters,
  page,
}: UseAdminFiltersConfig<F>): { filterReady: boolean } {
  const { user } = useAuthStore();
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const [filterReady, setFilterReady] = useState(false);

  // Auth guard — runs whenever `user` changes (login / logout)
  useEffect(() => {
    if (!user)                 { router.push("/login"); return; }
    if (user.role !== "admin") { router.push("/");      return; }
  }, [user, router]);

  // URL → store on mount; sets filterReady once done so data-fetch effects
  // can safely fire with the correct initial filter values.
  useEffect(() => {
    const parsed = Object.fromEntries(
      Object.keys(defaultFilters).map((key) => [
        key,
        searchParams.get(key) ?? defaultFilters[key as keyof F],
      ]),
    ) as Partial<F>;
    setFilter(parsed);
    const pg = Number(searchParams.get("page") ?? 1);
    if (pg > 1) setPage(pg);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilterReady(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Store → URL whenever filters / page change; skipped until filterReady to
  // avoid wiping the incoming URL params before the mount sync has run.
  useEffect(() => {
    if (!filterReady) return;
    const qs  = buildQS(filters, page);
    const url = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
    router.replace(url, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, page, filterReady]);

  return { filterReady };
}
