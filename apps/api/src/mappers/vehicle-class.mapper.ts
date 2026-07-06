import type { Prisma } from "../generated/prisma";
import type { VehicleClass, VehicleClassTranslation } from "@smart-dispatch/types";
import {
  parseVehicleClassTranslationsMap,
  vehicleClassTranslationsMapToArray,
  type VehicleClassTranslationsMap,
} from "../types/vehicle-class-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

type DbVehicleClass = {
  id: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations: Prisma.JsonValue;
};

export function pickVehicleClassTranslation(map: VehicleClassTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  return (
    map[preferred] ??
    map[DEFAULT_LOCALE] ??
    Object.values(map)[0] ??
    { name: "", description: null }
  );
}

export function pickVehicleClassLocale(map: VehicleClassTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  if (map[preferred]) return preferred;
  if (map[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  return Object.keys(map)[0] ?? DEFAULT_LOCALE;
}

export function toPublicVehicleClass(
  vehicleClass: DbVehicleClass,
  options?: { locale?: string; includeAllTranslations?: boolean },
): VehicleClass {
  const translationsMap = parseVehicleClassTranslationsMap(vehicleClass.translations);
  const locale = pickVehicleClassLocale(translationsMap, options?.locale);
  const translation = pickVehicleClassTranslation(translationsMap, options?.locale);

  const result: VehicleClass = {
    id: vehicleClass.id,
    slug: vehicleClass.slug,
    name: translation.name,
    description: translation.description,
    locale,
    is_active: vehicleClass.isActive,
    created_at: vehicleClass.createdAt.toISOString(),
    updated_at: vehicleClass.updatedAt.toISOString(),
  };

  if (options?.includeAllTranslations) {
    result.translations = vehicleClassTranslationsMapToArray(translationsMap);
  }

  return result;
}

export function toPublicVehicleClassTranslation(
  locale: string,
  value: { name: string; description: string | null },
): VehicleClassTranslation {
  return {
    locale,
    name: value.name,
    description: value.description,
  };
}
