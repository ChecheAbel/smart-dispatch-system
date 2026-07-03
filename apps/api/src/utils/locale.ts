export const DEFAULT_LOCALE = "en";

export const SUPPORTED_LOCALES = ["en", "am"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function normalizeLocale(locale?: string | null): SupportedLocale {
  const normalized = locale?.trim().toLowerCase().split("-")[0];
  if (normalized && SUPPORTED_LOCALES.includes(normalized as SupportedLocale)) {
    return normalized as SupportedLocale;
  }
  return DEFAULT_LOCALE;
}

export function parseLocale(
  query: Record<string, unknown>,
  acceptLanguageHeader?: string | string[],
) {
  const fromQuery = typeof query.locale === "string" ? query.locale : "";
  if (fromQuery.trim()) {
    return normalizeLocale(fromQuery);
  }

  const acceptLanguage = Array.isArray(acceptLanguageHeader)
    ? acceptLanguageHeader[0]
    : acceptLanguageHeader;

  if (acceptLanguage?.trim()) {
    return normalizeLocale(acceptLanguage.split(",")[0]);
  }

  return DEFAULT_LOCALE;
}
