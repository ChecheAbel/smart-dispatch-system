import type { Prisma } from "../generated/prisma";
import type { VehicleType, VehicleTypeTranslation } from "@smart-dispatch/types";
import {
  parseVehicleTypeTranslationsMap,
  vehicleTypeTranslationsMapToArray,
  type VehicleTypeTranslationsMap,
} from "../types/vehicle-type-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

type DbVehicleType = {
  id: string;
  slug: string;
  passengerCapacity: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations: Prisma.JsonValue;
};

export function pickVehicleTypeTranslation(map: VehicleTypeTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  return (
    map[preferred] ??
    map[DEFAULT_LOCALE] ??
    Object.values(map)[0] ??
    { name: "", description: null }
  );
}

export function pickVehicleTypeLocale(map: VehicleTypeTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  if (map[preferred]) return preferred;
  if (map[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  return Object.keys(map)[0] ?? DEFAULT_LOCALE;
}

export function toPublicVehicleType(
  vehicleType: DbVehicleType,
  options?: { locale?: string; includeAllTranslations?: boolean },
): VehicleType {
  const translationsMap = parseVehicleTypeTranslationsMap(vehicleType.translations);
  const locale = pickVehicleTypeLocale(translationsMap, options?.locale);
  const translation = pickVehicleTypeTranslation(translationsMap, options?.locale);

  const result: VehicleType = {
    id: vehicleType.id,
    slug: vehicleType.slug,
    name: translation.name,
    description: translation.description,
    locale,
    passenger_capacity: vehicleType.passengerCapacity,
    is_active: vehicleType.isActive,
    created_at: vehicleType.createdAt.toISOString(),
    updated_at: vehicleType.updatedAt.toISOString(),
  };

  if (options?.includeAllTranslations) {
    result.translations = vehicleTypeTranslationsMapToArray(translationsMap);
  }

  return result;
}

export function toPublicVehicleTypeTranslation(
  locale: string,
  value: { name: string; description: string | null },
): VehicleTypeTranslation {
  return {
    locale,
    name: value.name,
    description: value.description,
  };
}
