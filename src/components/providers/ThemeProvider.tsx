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

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
}

function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  /*
   * Lazy initializer: on the server this returns "system" (window is undefined);
   * on the client it reads from localStorage. The resulting hydration mismatch
   * on <html class="dark|..."> is suppressed by suppressHydrationWarning on
   * the root <html> element in layout.tsx.
   */
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  /*
   * Sync the DOM class whenever theme state changes.
   * This effect only mutates the external DOM — it never calls setState,
   * which satisfies the react-hooks/set-state-in-effect lint rule.
   */
  useEffect(() => {
    const resolved =
      theme === "system" ? getSystemPreference() : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [theme]);

  /* Re-sync DOM when the OS preference changes (relevant only for "system") */
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () =>
      document.documentElement.classList.toggle("dark", mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  /* resolvedTheme is derived — no extra state needed */
  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (theme === "system" ? getSystemPreference() : theme),
    [theme]
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
