import type { RoleTranslation } from "@smart-dispatch/types";
import { normalizeLocale } from "../utils/locale";

export type FarePlanTranslationValue = {
  name: string;
  description: string | null;
};

export type FarePlanTranslationsMap = Record<string, FarePlanTranslationValue>;

export type FarePlanTranslationInput = {
  locale: string;
  name: string;
  description?: string | null;
};

export function parseFarePlanTranslationsMap(value: unknown): FarePlanTranslationsMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const map: FarePlanTranslationsMap = {};
  for (const [locale, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;

    map[normalizeLocale(locale)] = {
      name,
      description:
        typeof record.description === "string"
          ? record.description.trim() || null
          : null,
    };
  }

  return map;
}

export function farePlanTranslationInputsToMap(
  inputs: FarePlanTranslationInput[],
): FarePlanTranslationsMap {
  const map: FarePlanTranslationsMap = {};

  for (const input of inputs) {
    const locale = normalizeLocale(input.locale);
    map[locale] = {
      name: input.name.trim(),
      description: input.description?.trim() || null,
    };
  }

  return map;
}

export function farePlanTranslationsMapToArray(map: FarePlanTranslationsMap): RoleTranslation[] {
  return Object.entries(map)
    .map(([locale, value]) => ({
      locale,
      name: value.name,
      description: value.description,
    }))
    .sort((left, right) => left.locale.localeCompare(right.locale));
}

export function mergeFarePlanTranslations(
  existing: FarePlanTranslationsMap,
  updates: FarePlanTranslationsMap,
): FarePlanTranslationsMap {
  return { ...existing, ...updates };
}
