"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "prakash-theme";

function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/*
 * Reads the stored theme synchronously.
 * Returns "system" during SSR (window is undefined) so server-rendered HTML
 * is always theme-neutral — ThemeToggle's `mounted` guard ensures no hydration
 * mismatch even when the client returns a different stored value.
 */
function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable (private browsing, storage quota, etc.)
  }
  return "system";
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /*
   * Lazy initializer — called once on mount, never during SSR.
   * Reading localStorage here (instead of in a useEffect) means the correct
   * theme is available on the very first client render, so the DOM-sync effect
   * below only ever fires with the right value. There is no intermediate
   * "system → stored" two-step that previously caused the dark class to flicker.
   *
   * Hydration safety: ThemeToggle's `mounted` guard keeps all buttons inactive
   * on the first pass (matching server HTML), so the different initial theme
   * value between SSR ("system") and client (stored) never produces a mismatch.
   */
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  /* Remove the transition-suppressor added by the blocking script in layout.tsx */
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      document.documentElement.classList.remove("no-transitions");
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore write failures
    }
  }, []);

  /* Sync the DOM class whenever theme state changes. */
  useEffect(() => {
    const resolved = theme === "system" ? getSystemPreference() : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [theme]);

  /* Re-sync DOM when the OS preference changes (only relevant for "system"). */
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () =>
      document.documentElement.classList.toggle("dark", mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (theme === "system" ? getSystemPreference() : theme),
    [theme],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
