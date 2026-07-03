"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Menu } from "@smart-dispatch/types";
import { useAdminLocale } from "@/components/admin/admin-locale-context";
import { flattenMenus, getPageTitleFromMenus } from "@/lib/admin-navigation";
import { fetchNavigationMenus } from "@/lib/menu-api";

type AdminNavigationContextValue = {
  menus: Menu[];
  flatMenus: Menu[];
  loading: boolean;
  error: string | null;
  refreshMenus: () => Promise<void>;
  getPageTitle: (pathname: string) => string;
};

const AdminNavigationContext = createContext<AdminNavigationContextValue | null>(null);

export function AdminNavigationProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useAdminLocale();
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
    void loadMenus();
  }, [loadMenus]);

  const flatMenus = useMemo(() => flattenMenus(menus), [menus]);

  const getPageTitle = useCallback(
    (pathname: string) => getPageTitleFromMenus(pathname, menus),
    [menus],
  );

  return (
    <AdminNavigationContext.Provider
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
    </AdminNavigationContext.Provider>
  );
}

export function useAdminNavigation() {
  const context = useContext(AdminNavigationContext);
  if (!context) {
    throw new Error("useAdminNavigation must be used within AdminNavigationProvider.");
  }
  return context;
}
