"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils/cn";

const OPTIONS: { value: Theme; Icon: React.ElementType; label: string }[] = [
  { value: "light",  Icon: Sun,     label: "Light mode"  },
  { value: "dark",   Icon: Moon,    label: "Dark mode"   },
  { value: "system", Icon: Monitor, label: "System mode" },
];

interface Props {
  /** Pass "navbar" for the inverted-on-dark-bg style used in the header */
  variant?: "navbar" | "default";
}

export default function ThemeToggle({ variant = "default" }: Props) {
  const { theme, setTheme } = useTheme();
  /*
   * mounted gates the active-button highlight.
   * During SSR and the initial hydration pass every button is inactive,
   * so server HTML and client HTML are identical → no hydration mismatch.
   * After mount the correct button lights up instantly.
   */
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

  const isNavbar = variant === "navbar";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full p-0.5",
        isNavbar ? "bg-gray-200/70 dark:bg-black/20" : "bg-gray-100 dark:bg-gray-800",
      )}
      role="group"
      aria-label="Choose colour theme"
    >
      {OPTIONS.map(({ value, Icon, label }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={active}
            className={cn(
              "p-1.5 rounded-full transition-colors duration-150",
              isNavbar
                ? active
                  ? "bg-white text-[#FCA311] dark:bg-white dark:text-[#FCA311]"
                  : "text-gray-500 dark:text-white/70 hover:text-gray-800 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
                : active
                  ? "bg-white dark:bg-gray-700 text-[#FCA311] dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
