import type { Contract, ContractStatus, ContractBillingInterval } from "@smart-dispatch/types";
import type { DbContract } from "../models/contract.model";
import { getContractScopeIds } from "../models/contract.model";
import { parseFarePlanTranslationsMap } from "../types/fare-plan-translations";
import { parseBookingPolicyTranslationsMap } from "../types/booking-policy-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

function formatPersonName(person: {
  firstName: string;
  middleName: string | null;
  lastName: string;
}) {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" ");
}

function pickFarePlanName(translations: unknown, locale?: string) {
  const map = parseFarePlanTranslationsMap(translations);
  const preferred = normalizeLocale(locale ?? DEFAULT_LOCALE);
  return (
    map[preferred]?.name ??
    map[DEFAULT_LOCALE]?.name ??
    Object.values(map)[0]?.name ??
    ""
  );
}

function pickBookingPolicyName(translations: unknown, locale?: string) {
  const map = parseBookingPolicyTranslationsMap(translations);
  const preferred = normalizeLocale(locale ?? DEFAULT_LOCALE);
  return (
    map[preferred]?.name ??
    map[DEFAULT_LOCALE]?.name ??
    Object.values(map)[0]?.name ??
    ""
  );
}

export function toPublicContract(contract: DbContract, options?: { locale?: string }): Contract {
  const scope = getContractScopeIds(contract);
  const locale = options?.locale;

  return {
    id: contract.id,
    reference_number: contract.referenceNumber,
    title: contract.title,
    status: contract.status as ContractStatus,
    fare_plan_id: contract.farePlanId,
    fare_plan: contract.farePlan
      ? {
          id: contract.farePlan.id,
          slug: contract.farePlan.slug,
          name: pickFarePlanName(contract.farePlan.translations, locale),
          pricing_model: contract.farePlan.pricingModel,
          currency: contract.farePlan.currency,
          base_fare: Number(contract.farePlan.baseFare),
          is_active: contract.farePlan.isActive,
        }
      : null,
    booking_policy_id: contract.bookingPolicyId,
    booking_policy: contract.bookingPolicy
      ? {
          id: contract.bookingPolicy.id,
          slug: contract.bookingPolicy.slug,
          name: pickBookingPolicyName(contract.bookingPolicy.translations, locale),
          min_advance_booking_hours: contract.bookingPolicy.minAdvanceBookingHours,
          max_advance_booking_hours: contract.bookingPolicy.maxAdvanceBookingHours,
          free_cancellation_hours: contract.bookingPolicy.freeCancellationHours,
          late_cancellation_type: contract.bookingPolicy.lateCancellationType,
          late_cancellation_fee: contract.bookingPolicy.lateCancellationFee
            ? Number(contract.bookingPolicy.lateCancellationFee)
            : null,
          no_show_type: contract.bookingPolicy.noShowType,
          no_show_fee: contract.bookingPolicy.noShowFee
            ? Number(contract.bookingPolicy.noShowFee)
            : null,
          currency: contract.bookingPolicy.currency,
          is_active: contract.bookingPolicy.isActive,
        }
      : null,
    notes: contract.notes,
    billing_interval: contract.billingInterval as ContractBillingInterval,
    payment_terms_days: contract.paymentTermsDays,
    region_ids: scope.regionIds,
    vehicle_type_ids: scope.vehicleTypeIds,
    vehicle_class_ids: scope.vehicleClassIds,
    created_by_user_id: contract.createdById,
    created_by: contract.createdBy
      ? {
          id: contract.createdBy.id,
          name: formatPersonName(contract.createdBy),
        }
      : null,
    created_at: contract.createdAt.toISOString(),
    updated_at: contract.updatedAt.toISOString(),
  };
}

export function toPublicContracts(contracts: DbContract[], options?: { locale?: string }) {
  return contracts.map((contract) =>
    toPublicContract(contract, {
      locale: options?.locale,
    }),
  );
}
