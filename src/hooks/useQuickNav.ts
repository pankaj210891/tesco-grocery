"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT = 5;

interface QuickNavState {
  open:        boolean;
  query:       string;
  recentHrefs: string[];

  setOpen:       (open: boolean) => void;
  toggle:        () => void;
  setQuery:      (q: string) => void;
  pushRecent:    (href: string) => void;
  clearRecent:   () => void;
}

const useQuickNavStore = create<QuickNavState>()(
  persist(
    (set, get) => ({
      open:        false,
      query:       "",
      recentHrefs: [],

      setOpen:  (open)  => set({ open, query: "" }),
      toggle:   ()      => set((s) => ({ open: !s.open, query: "" })),
      setQuery: (query) => set({ query }),

      pushRecent: (href) => {
        const prev    = get().recentHrefs.filter((h) => h !== href);
        const updated = [href, ...prev].slice(0, MAX_RECENT);
        set({ recentHrefs: updated });
      },

      clearRecent: () => set({ recentHrefs: [] }),
    }),
    {
      name:    "prakash-quick-nav",
      partialize: (s) => ({ recentHrefs: s.recentHrefs }),
    }
  )
);

export function useQuickNav() {
  return useQuickNavStore();
}
