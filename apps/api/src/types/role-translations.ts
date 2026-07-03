import type { RoleTranslation } from "@smart-dispatch/types";
import { normalizeLocale } from "../utils/locale";

export type RoleTranslationValue = {
  name: string;
  description: string | null;
};

export type RoleTranslationsMap = Record<string, RoleTranslationValue>;

export type RoleTranslationInput = {
  locale: string;
  name: string;
  description?: string | null;
};

export function parseRoleTranslationsMap(value: unknown): RoleTranslationsMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const map: RoleTranslationsMap = {};
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

export function roleTranslationInputsToMap(
  inputs: RoleTranslationInput[],
): RoleTranslationsMap {
  const map: RoleTranslationsMap = {};

  for (const input of inputs) {
    const locale = normalizeLocale(input.locale);
    map[locale] = {
      name: input.name.trim(),
      description: input.description?.trim() || null,
    };
  }

  return map;
}

export function roleTranslationsMapToArray(map: RoleTranslationsMap): RoleTranslation[] {
  return Object.entries(map)
    .map(([locale, value]) => ({
      locale,
      name: value.name,
      description: value.description,
    }))
    .sort((left, right) => left.locale.localeCompare(right.locale));
}

export function mergeRoleTranslations(
  existing: RoleTranslationsMap,
  updates: RoleTranslationsMap,
): RoleTranslationsMap {
  return { ...existing, ...updates };
}
