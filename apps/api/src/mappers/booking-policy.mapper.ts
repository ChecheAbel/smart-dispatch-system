import type { Prisma } from "../generated/prisma";
import type {
  BookingPolicy,
  BookingPolicyTranslation,
  LateCancellationType,
} from "@smart-dispatch/types";
import {
  bookingPolicyTranslationsMapToArray,
  parseBookingPolicyTranslationsMap,
  type BookingPolicyTranslationsMap,
} from "../types/booking-policy-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

type DbBookingPolicy = {
  id: string;
  slug: string;
  minAdvanceBookingHours: number;
  maxAdvanceBookingHours: number;
  freeCancellationHours: number;
  lateCancellationType: LateCancellationType;
  lateCancellationFee: Prisma.Decimal | null;
  currency: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations: Prisma.JsonValue;
};

function pickBookingPolicyTranslation(map: BookingPolicyTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  return (
    map[preferred] ??
    map[DEFAULT_LOCALE] ??
    Object.values(map)[0] ??
    { name: "", description: null }
  );
}

function pickBookingPolicyLocale(map: BookingPolicyTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  if (map[preferred]) return preferred;
  if (map[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  return Object.keys(map)[0] ?? DEFAULT_LOCALE;
}

function decimalToNumber(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value);
}

export function toPublicBookingPolicy(
  policy: DbBookingPolicy,
  options?: { locale?: string; includeAllTranslations?: boolean },
): BookingPolicy {
  const translationsMap = parseBookingPolicyTranslationsMap(policy.translations);
  const locale = pickBookingPolicyLocale(translationsMap, options?.locale);
  const translation = pickBookingPolicyTranslation(translationsMap, options?.locale);

  const result: BookingPolicy = {
    id: policy.id,
    slug: policy.slug,
    name: translation.name,
    description: translation.description,
    locale,
    min_advance_booking_hours: policy.minAdvanceBookingHours,
    max_advance_booking_hours: policy.maxAdvanceBookingHours,
    free_cancellation_hours: policy.freeCancellationHours,
    late_cancellation_type: policy.lateCancellationType,
    late_cancellation_fee: decimalToNumber(policy.lateCancellationFee),
    currency: policy.currency,
    is_active: policy.isActive,
    created_at: policy.createdAt.toISOString(),
    updated_at: policy.updatedAt.toISOString(),
  };

  if (options?.includeAllTranslations) {
    result.translations = bookingPolicyTranslationsMapToArray(
      translationsMap,
    ) as BookingPolicyTranslation[];
  }

  return result;
}

export function toPublicBookingPolicySummary(
  policy: DbBookingPolicy,
  options?: { locale?: string },
) {
  const publicPolicy = toPublicBookingPolicy(policy, options);
  return {
    id: publicPolicy.id,
    slug: publicPolicy.slug,
    name: publicPolicy.name,
    min_advance_booking_hours: publicPolicy.min_advance_booking_hours,
    max_advance_booking_hours: publicPolicy.max_advance_booking_hours,
    free_cancellation_hours: publicPolicy.free_cancellation_hours,
    late_cancellation_type: publicPolicy.late_cancellation_type,
    late_cancellation_fee: publicPolicy.late_cancellation_fee,
    currency: publicPolicy.currency,
    is_active: publicPolicy.is_active,
  };
}
