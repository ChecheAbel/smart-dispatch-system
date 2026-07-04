"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Menu } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers/locale-context";
import { flattenMenus, getPageTitleFromMenus } from "@/lib/admin-navigation";
import { fetchNavigationMenus } from "@/lib/menu-api";

type NavigationContextValue = {
  menus: Menu[];
  flatMenus: Menu[];
  loading: boolean;
  error: string | null;
  refreshMenus: () => Promise<void>;
  getPageTitle: (pathname: string) => string;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocale();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMenus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextMenus = await fetchNavigationMenus(locale);
      setMenus(nextMenus);
    } catch (err) {
      setMenus([]);
      setError(err instanceof Error ? err.message : "Failed to load navigation.");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextMenus = await fetchNavigationMenus(locale);
        if (!cancelled) {
          setMenus(nextMenus);
        }
      } catch (err) {
        if (!cancelled) {
          setMenus([]);
          setError(err instanceof Error ? err.message : "Failed to load navigation.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [locale]);

  const flatMenus = useMemo(() => flattenMenus(menus), [menus]);

  const getPageTitle = useCallback(
    (pathname: string) => getPageTitleFromMenus(pathname, menus),
    [menus],
  );

  return (
    <NavigationContext.Provider
      value={{
        menus,
        flatMenus,
        loading,
        error,
        refreshMenus: loadMenus,
        getPageTitle,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider.");
  }
  return context;
}
