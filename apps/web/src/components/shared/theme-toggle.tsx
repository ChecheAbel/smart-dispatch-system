"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "smart-dispatch-theme";

function getActiveTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle({
  placement = "floating",
  className,
}: {
  placement?: "floating" | "inline";
  className?: string;
}) {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const syncWithSystemTheme = (event: MediaQueryListEvent) => {
      if (window.localStorage.getItem(THEME_STORAGE_KEY)) return;

      const nextTheme: Theme = event.matches ? "dark" : "light";
      document.documentElement.classList.toggle("dark", nextTheme === "dark");
      document.documentElement.style.colorScheme = nextTheme;
    };

    mediaQuery.addEventListener("change", syncWithSystemTheme);
    return () => mediaQuery.removeEventListener("change", syncWithSystemTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = getActiveTheme() === "dark" ? "light" : "dark";

    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        placement === "floating"
          ? "theme-toggle theme-toggle-floating fixed right-4 bottom-4 z-[10001] inline-flex size-11 items-center justify-center rounded-full border border-[var(--brand-accent)]/35 bg-background/90 text-foreground shadow-[0_12px_35px_rgba(9,24,20,0.22)] backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-[var(--brand-accent)]/70 hover:text-[var(--brand-accent)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-accent)]/35 sm:right-6 sm:bottom-6"
          : "theme-toggle inline-flex size-9 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-[var(--brand-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--brand-primary)_6%,transparent)] hover:text-[var(--brand-accent)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--brand-accent)]/35 dark:text-foreground",
        className,
      )}
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      <Sun className="size-[18px] dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-[18px] dark:block" aria-hidden="true" />
      <span className="sr-only">Toggle color theme</span>
    </button>
  );
}
