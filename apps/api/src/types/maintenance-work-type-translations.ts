import type { RoleTranslation } from "@smart-dispatch/types";
import { normalizeLocale } from "../utils/locale";

export type MaintenanceWorkTypeTranslationValue = {
  name: string;
  description: string | null;
};

export type MaintenanceWorkTypeTranslationsMap = Record<string, MaintenanceWorkTypeTranslationValue>;

export type MaintenanceWorkTypeTranslationInput = {
  locale: string;
  name: string;
  description?: string | null;
};

export function parseMaintenanceWorkTypeTranslationsMap(
  value: unknown,
): MaintenanceWorkTypeTranslationsMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const map: MaintenanceWorkTypeTranslationsMap = {};
  for (const [locale, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const record = entry as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    if (!name) continue;

    map[normalizeLocale(locale)] = {
      name,
      description:
        typeof record.description === "string" ? record.description.trim() || null : null,
    };
  }

  return map;
}

export function maintenanceWorkTypeTranslationInputsToMap(
  inputs: MaintenanceWorkTypeTranslationInput[],
): MaintenanceWorkTypeTranslationsMap {
  const map: MaintenanceWorkTypeTranslationsMap = {};

  for (const input of inputs) {
    const locale = normalizeLocale(input.locale);
    map[locale] = {
      name: input.name.trim(),
      description: input.description?.trim() || null,
    };
  }

  return map;
}

export function maintenanceWorkTypeTranslationsMapToArray(
  map: MaintenanceWorkTypeTranslationsMap,
): RoleTranslation[] {
  return Object.entries(map)
    .map(([locale, value]) => ({
      locale,
      name: value.name,
      description: value.description,
    }))
    .sort((left, right) => left.locale.localeCompare(right.locale));
}

export function mergeMaintenanceWorkTypeTranslations(
  existing: MaintenanceWorkTypeTranslationsMap,
  updates: MaintenanceWorkTypeTranslationsMap,
): MaintenanceWorkTypeTranslationsMap {
  return { ...existing, ...updates };
}
