"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  getLocaleLabel,
  getStoredLocale,
  saveLocale,
  type SupportedLocale,
} from "@/lib/locale";

type AdminLocaleContextValue = {
  locale: SupportedLocale;
  localeLabel: string;
  setLocale: (locale: SupportedLocale) => void;
};

const AdminLocaleContext = createContext<AdminLocaleContextValue | null>(null);

export function AdminLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: SupportedLocale) {
    saveLocale(next);
    setLocaleState(next);
  }

  return (
    <AdminLocaleContext.Provider
      value={{
        locale,
        localeLabel: getLocaleLabel(locale),
        setLocale,
      }}
    >
      {children}
    </AdminLocaleContext.Provider>
  );
}

export function useAdminLocale() {
  const context = useContext(AdminLocaleContext);
  if (!context) {
    throw new Error("useAdminLocale must be used within AdminLocaleProvider.");
  }
  return context;
}
