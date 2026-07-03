import type { MenuTranslation } from "@smart-dispatch/types";
import { normalizeLocale } from "../utils/locale";

export type MenuTranslationValue = {
  label: string;
};

export type MenuTranslationsMap = Record<string, MenuTranslationValue>;

export type MenuTranslationInput = {
  locale: string;
  label: string;
};

export function parseMenuTranslationsMap(value: unknown): MenuTranslationsMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const map: MenuTranslationsMap = {};
  for (const [locale, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    if (!label) continue;

    map[normalizeLocale(locale)] = { label };
  }

  return map;
}

export function menuTranslationInputsToMap(
  inputs: MenuTranslationInput[],
): MenuTranslationsMap {
  const map: MenuTranslationsMap = {};

  for (const input of inputs) {
    const locale = normalizeLocale(input.locale);
    map[locale] = { label: input.label.trim() };
  }

  return map;
}

export function menuTranslationsMapToArray(map: MenuTranslationsMap): MenuTranslation[] {
  return Object.entries(map)
    .map(([locale, value]) => ({
      locale,
      label: value.label,
    }))
    .sort((left, right) => left.locale.localeCompare(right.locale));
}

export function mergeMenuTranslations(
  existing: MenuTranslationsMap,
  updates: MenuTranslationsMap,
): MenuTranslationsMap {
  return { ...existing, ...updates };
}
