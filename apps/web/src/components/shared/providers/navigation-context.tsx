"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Menu } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers/locale-context";
import {
  flattenMenus,
  getPageTitleFromMenus,
} from "@/lib/admin-navigation";
import {
  getCustomerPageTitleFromMenus,
} from "@/lib/customer-navigation";
import { filterMenusForPortal, type NavigationPortal } from "@/lib/portal-navigation";
import { ADMIN_PROFILE_PATH, USER_PROFILE_PATH } from "@/lib/auth-paths";
import { fetchNavigationMenus } from "@/lib/menu-api";
import { getAdminProfileMessages } from "@/translations";
import { PORTAL_SHELL_CONFIG } from "@/lib/portal-shell-config";

type NavigationContextValue = {
  menus: Menu[];
  flatMenus: Menu[];
  loading: boolean;
  error: string | null;
  refreshMenus: () => Promise<void>;
  getPageTitle: (pathname: string) => string;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({
  children,
  portal = "admin",
}: {
  children: React.ReactNode;
  portal?: NavigationPortal;
}) {
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

  const portalMenus = useMemo(() => filterMenusForPortal(menus, portal), [menus, portal]);
  const flatMenus = useMemo(() => flattenMenus(portalMenus), [portalMenus]);

  const getPageTitle = useCallback(
    (pathname: string) => {
      if (portal === "admin" && pathname === ADMIN_PROFILE_PATH) {
        return getAdminProfileMessages(locale).title;
      }

      if (portal === "customer") {
        if (pathname === USER_PROFILE_PATH) {
          return PORTAL_SHELL_CONFIG.customer.getProfileLabel(locale);
        }

        return getCustomerPageTitleFromMenus(pathname, portalMenus);
      }

      return getPageTitleFromMenus(pathname, portalMenus);
    },
    [locale, portal, portalMenus],
  );

  return (
    <NavigationContext.Provider
      value={{
        menus: portalMenus,
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
