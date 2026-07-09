import type { Prisma } from "../generated/prisma";
import type { MaintenanceWorkType, MaintenanceWorkTypeTranslation } from "@smart-dispatch/types";
import {
  maintenanceWorkTypeTranslationsMapToArray,
  parseMaintenanceWorkTypeTranslationsMap,
  type MaintenanceWorkTypeTranslationsMap,
} from "../types/maintenance-work-type-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

type DbMaintenanceWorkType = {
  id: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  translations: Prisma.JsonValue;
};

export function pickMaintenanceWorkTypeTranslation(
  map: MaintenanceWorkTypeTranslationsMap,
  locale?: string,
) {
  const preferred = normalizeLocale(locale);
  return (
    map[preferred] ??
    map[DEFAULT_LOCALE] ??
    Object.values(map)[0] ??
    { name: "", description: null }
  );
}

export function pickMaintenanceWorkTypeLocale(
  map: MaintenanceWorkTypeTranslationsMap,
  locale?: string,
) {
  const preferred = normalizeLocale(locale);
  if (map[preferred]) return preferred;
  if (map[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  return Object.keys(map)[0] ?? DEFAULT_LOCALE;
}

export function toPublicMaintenanceWorkType(
  workType: DbMaintenanceWorkType,
  options?: { locale?: string; includeAllTranslations?: boolean },
): MaintenanceWorkType {
  const translationsMap = parseMaintenanceWorkTypeTranslationsMap(workType.translations);
  const locale = pickMaintenanceWorkTypeLocale(translationsMap, options?.locale);
  const translation = pickMaintenanceWorkTypeTranslation(translationsMap, options?.locale);

  const result: MaintenanceWorkType = {
    id: workType.id,
    slug: workType.slug,
    name: translation.name,
    description: translation.description,
    locale,
    is_active: workType.isActive,
    sort_order: workType.sortOrder,
    created_at: workType.createdAt.toISOString(),
    updated_at: workType.updatedAt.toISOString(),
  };

  if (options?.includeAllTranslations) {
    result.translations = maintenanceWorkTypeTranslationsMapToArray(
      translationsMap,
    ) as MaintenanceWorkTypeTranslation[];
  }

  return result;
}

export function toPublicMaintenanceWorkTypeSummary(
  workType: DbMaintenanceWorkType,
  options?: { locale?: string },
) {
  const publicType = toPublicMaintenanceWorkType(workType, options);
  return {
    id: publicType.id,
    slug: publicType.slug,
    name: publicType.name,
  };
}
