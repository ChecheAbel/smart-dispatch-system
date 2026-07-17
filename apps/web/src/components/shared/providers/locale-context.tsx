"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  getLocaleLabel,
  getStoredLocale,
  normalizeLocale,
  saveLocale,
  type SupportedLocale,
} from "@/lib/locale";

type LocaleContextValue = {
  locale: SupportedLocale;
  localeLabel: string;
  setLocale: (locale: SupportedLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    const storedLocale = getStoredLocale();
    setLocaleState((current) => (current === storedLocale ? current : storedLocale));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: SupportedLocale) {
    const normalized = normalizeLocale(next);
    setLocaleState((current) => {
      if (current === normalized) {
        return current;
      }

      saveLocale(normalized);
      return normalized;
    });
  }

  return (
    <LocaleContext.Provider
      value={{
        locale,
        localeLabel: getLocaleLabel(locale),
        setLocale,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider.");
  }
  return context;
}
