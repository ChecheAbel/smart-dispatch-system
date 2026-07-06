import type { RoleTranslation } from "@smart-dispatch/types";
import { normalizeLocale } from "../utils/locale";

export type VehicleClassTranslationValue = {
  name: string;
  description: string | null;
};

export type VehicleClassTranslationsMap = Record<string, VehicleClassTranslationValue>;

export type VehicleClassTranslationInput = {
  locale: string;
  name: string;
  description?: string | null;
};

export function parseVehicleClassTranslationsMap(value: unknown): VehicleClassTranslationsMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const map: VehicleClassTranslationsMap = {};
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

export function vehicleClassTranslationInputsToMap(
  inputs: VehicleClassTranslationInput[],
): VehicleClassTranslationsMap {
  const map: VehicleClassTranslationsMap = {};

  for (const input of inputs) {
    const locale = normalizeLocale(input.locale);
    map[locale] = {
      name: input.name.trim(),
      description: input.description?.trim() || null,
    };
  }

  return map;
}

export function vehicleClassTranslationsMapToArray(
  map: VehicleClassTranslationsMap,
): RoleTranslation[] {
  return Object.entries(map)
    .map(([locale, value]) => ({
      locale,
      name: value.name,
      description: value.description,
    }))
    .sort((left, right) => left.locale.localeCompare(right.locale));
}

export function mergeVehicleClassTranslations(
  existing: VehicleClassTranslationsMap,
  updates: VehicleClassTranslationsMap,
): VehicleClassTranslationsMap {
  return { ...existing, ...updates };
}
