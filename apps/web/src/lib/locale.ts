export const SUPPORTED_LOCALES = ["en", "am"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "en";

const LOCALE_STORAGE_KEY = "sds_locale";

export const LOCALE_OPTIONS: Array<{
  value: SupportedLocale;
  label: string;
  nativeLabel: string;
}> = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "am", label: "Amharic", nativeLabel: "አማርኛ" },
];

export function normalizeLocale(value?: string | null): SupportedLocale {
  const normalized = value?.trim().toLowerCase().split("-")[0];
  if (normalized && SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

export function getStoredLocale(): SupportedLocale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
}

export function saveLocale(locale: SupportedLocale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function getLocaleLabel(locale: SupportedLocale) {
  return LOCALE_OPTIONS.find((option) => option.value === locale)?.nativeLabel ?? locale;
}
