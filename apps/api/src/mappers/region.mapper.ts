import type { Prisma } from "../generated/prisma";
import type { Region } from "@smart-dispatch/types";
import {
  parseRegionTranslationsMap,
  regionTranslationsMapToArray,
  type RegionTranslationsMap,
} from "../types/region-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

type DbRegion = {
  id: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations: Prisma.JsonValue;
};

function pickRegionTranslation(map: RegionTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  return (
    map[preferred] ??
    map[DEFAULT_LOCALE] ??
    Object.values(map)[0] ??
    { name: "", description: null }
  );
}

function pickRegionLocale(map: RegionTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  if (map[preferred]) return preferred;
  if (map[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  return Object.keys(map)[0] ?? DEFAULT_LOCALE;
}

export function toPublicRegion(
  region: DbRegion,
  options?: { locale?: string; includeAllTranslations?: boolean },
): Region {
  const translationsMap = parseRegionTranslationsMap(region.translations);
  const locale = pickRegionLocale(translationsMap, options?.locale);
  const translation = pickRegionTranslation(translationsMap, options?.locale);

  const result: Region = {
    id: region.id,
    slug: region.slug,
    name: translation.name,
    description: translation.description,
    locale,
    is_active: region.isActive,
    created_at: region.createdAt.toISOString(),
    updated_at: region.updatedAt.toISOString(),
  };

  if (options?.includeAllTranslations) {
    result.translations = regionTranslationsMapToArray(translationsMap);
  }

  return result;
}
