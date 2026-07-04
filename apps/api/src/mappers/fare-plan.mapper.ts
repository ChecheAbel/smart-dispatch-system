import type { Prisma, PricingModel } from "../generated/prisma";
import type { FarePlan } from "@smart-dispatch/types";
import {
  farePlanTranslationsMapToArray,
  parseFarePlanTranslationsMap,
  type FarePlanTranslationsMap,
} from "../types/fare-plan-translations";
import { parseRegionTranslationsMap } from "../types/region-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

type DbFarePlan = {
  id: string;
  slug: string;
  vehicleTypeId: string | null;
  regionId: string | null;
  pricingModel: PricingModel;
  currency: string;
  baseFare: Prisma.Decimal;
  perKmRate: Prisma.Decimal | null;
  perMinuteRate: Prisma.Decimal | null;
  minimumFare: Prisma.Decimal | null;
  bookingFee: Prisma.Decimal | null;
  freeWaitingMinutes: number | null;
  waitingFeePerMinute: Prisma.Decimal | null;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations: Prisma.JsonValue;
  vehicleType?: {
    id: string;
    slug: string;
    translations: Prisma.JsonValue;
  } | null;
  region?: {
    id: string;
    slug: string;
    translations: Prisma.JsonValue;
  } | null;
};

function pickFarePlanTranslation(map: FarePlanTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  return (
    map[preferred] ??
    map[DEFAULT_LOCALE] ??
    Object.values(map)[0] ??
    { name: "", description: null }
  );
}

function pickFarePlanLocale(map: FarePlanTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  if (map[preferred]) return preferred;
  if (map[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  return Object.keys(map)[0] ?? DEFAULT_LOCALE;
}

function pickRelatedName(translations: Prisma.JsonValue, locale?: string) {
  const map = parseRegionTranslationsMap(translations);
  const preferred = normalizeLocale(locale);
  return (
    map[preferred]?.name ??
    map[DEFAULT_LOCALE]?.name ??
    Object.values(map)[0]?.name ??
    ""
  );
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value);
}

export function toPublicFarePlan(
  farePlan: DbFarePlan,
  options?: { locale?: string; includeAllTranslations?: boolean },
): FarePlan {
  const translationsMap = parseFarePlanTranslationsMap(farePlan.translations);
  const locale = pickFarePlanLocale(translationsMap, options?.locale);
  const translation = pickFarePlanTranslation(translationsMap, options?.locale);

  const result: FarePlan = {
    id: farePlan.id,
    slug: farePlan.slug,
    name: translation.name,
    description: translation.description,
    locale,
    vehicle_type_id: farePlan.vehicleTypeId,
    region_id: farePlan.regionId,
    pricing_model: farePlan.pricingModel,
    currency: farePlan.currency,
    base_fare: Number(farePlan.baseFare),
    per_km_rate: decimalToNumber(farePlan.perKmRate),
    per_minute_rate: decimalToNumber(farePlan.perMinuteRate),
    minimum_fare: decimalToNumber(farePlan.minimumFare),
    booking_fee: decimalToNumber(farePlan.bookingFee),
    free_waiting_minutes: farePlan.freeWaitingMinutes,
    waiting_fee_per_minute: decimalToNumber(farePlan.waitingFeePerMinute),
    priority: farePlan.priority,
    is_active: farePlan.isActive,
    created_at: farePlan.createdAt.toISOString(),
    updated_at: farePlan.updatedAt.toISOString(),
  };

  if (farePlan.vehicleType) {
    result.vehicle_type = {
      id: farePlan.vehicleType.id,
      slug: farePlan.vehicleType.slug,
      name: pickRelatedName(farePlan.vehicleType.translations, options?.locale),
    };
  }

  if (farePlan.region) {
    result.region = {
      id: farePlan.region.id,
      slug: farePlan.region.slug,
      name: pickRelatedName(farePlan.region.translations, options?.locale),
    };
  }

  if (options?.includeAllTranslations) {
    result.translations = farePlanTranslationsMapToArray(translationsMap);
  }

  return result;
}
