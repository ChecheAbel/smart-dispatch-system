import type { Prisma } from "../generated/prisma";
import type { Location } from "@smart-dispatch/types";
import { parseRegionTranslationsMap } from "../types/region-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";
import { toPublicRegion } from "./region.mapper";

type DbLocation = {
  id: string;
  regionId: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
  address: string | null;
  canPickup: boolean;
  canDropoff: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations: Prisma.JsonValue;
  region: {
    id: string;
    slug: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    translations: Prisma.JsonValue;
  };
};

export function pickLocationName(translations: Prisma.JsonValue, locale?: string) {
  const map = parseRegionTranslationsMap(translations);
  const preferred = normalizeLocale(locale);
  return (
    map[preferred]?.name ??
    map[DEFAULT_LOCALE]?.name ??
    Object.values(map)[0]?.name ??
    ""
  );
}

export function toPublicLocation(location: DbLocation, options?: { locale?: string }): Location {
  const region = toPublicRegion(location.region, { locale: options?.locale });

  return {
    id: location.id,
    region_id: location.regionId,
    region: {
      id: region.id,
      slug: region.slug,
      name: region.name,
    },
    name: pickLocationName(location.translations, options?.locale),
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    address: location.address,
    can_pickup: location.canPickup,
    can_dropoff: location.canDropoff,
    is_active: location.isActive,
    created_at: location.createdAt.toISOString(),
    updated_at: location.updatedAt.toISOString(),
  };
}

export function toPublicLocationDetail(
  location: DbLocation,
  options?: { locale?: string; includeAllTranslations?: boolean },
): Location {
  const base = toPublicLocation(location, options);
  const translationsMap = parseRegionTranslationsMap(location.translations);

  if (options?.includeAllTranslations) {
    base.translations = Object.entries(translationsMap).map(([locale, value]) => ({
      locale,
      name: value.name,
      description: value.description,
    }));
  }

  return base;
}

export function toRideRequestLocationOption(
  location: DbLocation,
  options?: { locale?: string },
) {
  const region = toPublicRegion(location.region, { locale: options?.locale });

  return {
    id: location.id,
    region_id: location.regionId,
    region: {
      id: region.id,
      slug: region.slug,
      name: region.name,
    },
    name: pickLocationName(location.translations, options?.locale),
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    address: location.address,
  };
}
