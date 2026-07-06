import { Prisma, PricingModel } from "../generated/prisma";
import { prisma } from "../db/prisma";
import {
  farePlanTranslationInputsToMap,
  mergeFarePlanTranslations,
  parseFarePlanTranslationsMap,
  type FarePlanTranslationInput,
  type FarePlanTranslationsMap,
} from "../types/fare-plan-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";
import { generateSlugFromText } from "../utils/slug";

export type { FarePlanTranslationInput };

export type CreateFarePlanInput = {
  translations: FarePlanTranslationInput[];
  vehicleTypeId?: string | null;
  vehicleClassId?: string | null;
  regionId?: string | null;
  pricingModel: PricingModel;
  currency?: string;
  baseFare: number;
  perKmRate?: number | null;
  perMinuteRate?: number | null;
  minimumFare?: number | null;
  bookingFee?: number | null;
  freeWaitingMinutes?: number | null;
  waitingFeePerMinute?: number | null;
  priority?: number;
  isActive?: boolean;
};

export type UpdateFarePlanInput = {
  translations?: FarePlanTranslationInput[];
  vehicleTypeId?: string | null;
  vehicleClassId?: string | null;
  regionId?: string | null;
  pricingModel?: PricingModel;
  currency?: string;
  baseFare?: number;
  perKmRate?: number | null;
  perMinuteRate?: number | null;
  minimumFare?: number | null;
  bookingFee?: number | null;
  freeWaitingMinutes?: number | null;
  waitingFeePerMinute?: number | null;
  priority?: number;
  isActive?: boolean;
};

export type ListFarePlansFilter = {
  search?: string;
  isActive?: boolean;
  pricingModel?: PricingModel;
  vehicleTypeId?: string;
  vehicleClassId?: string;
  regionId?: string;
};

export type ResolveFarePlanInput = {
  vehicleTypeId?: string | null;
  vehicleClassId?: string | null;
  regionId?: string | null;
};

const farePlanInclude = {
  vehicleType: true,
  vehicleClass: true,
  region: true,
} as const;

function toJsonTranslations(translations: FarePlanTranslationsMap): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

function toOptionalDecimal(value: number | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return toDecimal(value);
}

export function slugFromFarePlanTranslations(translations: FarePlanTranslationInput[]) {
  const englishName = translations.find(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  )?.name;

  return englishName ? generateSlugFromText(englishName) : "";
}

async function ensureUniqueFarePlanSlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (await prisma.farePlan.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function listFarePlansWithSearch(search: string, skip: number, take: number) {
  const pattern = `%${search}%`;

  return prisma.$queryRaw<
    Array<{
      id: string;
      slug: string;
      translations: Prisma.JsonValue;
      vehicleTypeId: string | null;
      vehicleClassId: string | null;
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
    }>
  >`
    SELECT
      id,
      slug,
      translations,
      vehicle_type_id AS "vehicleTypeId",
      vehicle_class_id AS "vehicleClassId",
      region_id AS "regionId",
      pricing_model AS "pricingModel",
      currency,
      base_fare AS "baseFare",
      per_km_rate AS "perKmRate",
      per_minute_rate AS "perMinuteRate",
      minimum_fare AS "minimumFare",
      booking_fee AS "bookingFee",
      free_waiting_minutes AS "freeWaitingMinutes",
      waiting_fee_per_minute AS "waitingFeePerMinute",
      priority,
      is_active AS "isActive",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM fare_plans
    WHERE slug ILIKE ${pattern} OR translations::text ILIKE ${pattern}
    ORDER BY priority DESC, slug ASC
    LIMIT ${take} OFFSET ${skip}
  `;
}

async function countFarePlansWithSearch(search: string) {
  const pattern = `%${search}%`;
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count
    FROM fare_plans
    WHERE slug ILIKE ${pattern} OR translations::text ILIKE ${pattern}
  `;

  return Number(result[0]?.count ?? 0);
}

export async function findFarePlanById(id: string) {
  return prisma.farePlan.findUnique({
    where: { id },
    include: farePlanInclude,
  });
}

export async function listFarePlans(
  filter?: ListFarePlansFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;
  const search = filter?.search?.trim();

  if (search) {
    const rows = await listFarePlansWithSearch(search, skip, take);
    if (!rows.length) return [];

    const ids = rows.map((row) => row.id);
    const plans = await prisma.farePlan.findMany({
      where: { id: { in: ids } },
      include: farePlanInclude,
    });

    const planMap = new Map(plans.map((plan) => [plan.id, plan]));
    return ids.map((id) => planMap.get(id)).filter(Boolean) as typeof plans;
  }

  return prisma.farePlan.findMany({
    where: {
      ...(filter?.isActive === undefined ? {} : { isActive: filter.isActive }),
      ...(filter?.pricingModel ? { pricingModel: filter.pricingModel } : {}),
      ...(filter?.vehicleTypeId ? { vehicleTypeId: filter.vehicleTypeId } : {}),
      ...(filter?.vehicleClassId ? { vehicleClassId: filter.vehicleClassId } : {}),
      ...(filter?.regionId ? { regionId: filter.regionId } : {}),
    },
    include: farePlanInclude,
    skip,
    take,
    orderBy: [{ priority: "desc" }, { slug: "asc" }],
  });
}

export async function countFarePlans(filter?: ListFarePlansFilter) {
  const search = filter?.search?.trim();

  if (search) {
    return countFarePlansWithSearch(search);
  }

  return prisma.farePlan.count({
    where: {
      ...(filter?.isActive === undefined ? {} : { isActive: filter.isActive }),
      ...(filter?.pricingModel ? { pricingModel: filter.pricingModel } : {}),
      ...(filter?.vehicleTypeId ? { vehicleTypeId: filter.vehicleTypeId } : {}),
      ...(filter?.vehicleClassId ? { vehicleClassId: filter.vehicleClassId } : {}),
      ...(filter?.regionId ? { regionId: filter.regionId } : {}),
    },
  });
}

export async function createFarePlan(input: CreateFarePlanInput) {
  const translations = farePlanTranslationInputsToMap(input.translations);
  const baseSlug = slugFromFarePlanTranslations(input.translations);

  if (!baseSlug) {
    throw new Error("FARE_PLAN_SLUG_REQUIRED");
  }

  const slug = await ensureUniqueFarePlanSlug(baseSlug);

  return prisma.farePlan.create({
    data: {
      slug,
      translations: toJsonTranslations(translations),
      vehicleTypeId: input.vehicleTypeId ?? null,
      vehicleClassId: input.vehicleClassId ?? null,
      regionId: input.regionId ?? null,
      pricingModel: input.pricingModel,
      currency: input.currency?.trim().toUpperCase() || "ETB",
      baseFare: toDecimal(input.baseFare),
      perKmRate: toOptionalDecimal(input.perKmRate),
      perMinuteRate: toOptionalDecimal(input.perMinuteRate),
      minimumFare: toOptionalDecimal(input.minimumFare),
      bookingFee: toOptionalDecimal(input.bookingFee),
      freeWaitingMinutes: input.freeWaitingMinutes ?? null,
      waitingFeePerMinute: toOptionalDecimal(input.waitingFeePerMinute),
      priority: input.priority ?? 0,
      isActive: input.isActive ?? true,
    },
    include: farePlanInclude,
  });
}

export async function updateFarePlan(id: string, input: UpdateFarePlanInput) {
  let translationsUpdate: FarePlanTranslationsMap | undefined;

  if (input.translations?.length) {
    const existing = await prisma.farePlan.findUnique({ where: { id } });
    const currentTranslations = parseFarePlanTranslationsMap(existing?.translations);
    translationsUpdate = mergeFarePlanTranslations(
      currentTranslations,
      farePlanTranslationInputsToMap(input.translations),
    );
  }

  return prisma.farePlan.update({
    where: { id },
    data: {
      translations: translationsUpdate
        ? toJsonTranslations(translationsUpdate)
        : undefined,
      vehicleTypeId: input.vehicleTypeId,
      vehicleClassId: input.vehicleClassId,
      regionId: input.regionId,
      pricingModel: input.pricingModel,
      currency: input.currency?.trim().toUpperCase(),
      baseFare: input.baseFare === undefined ? undefined : toDecimal(input.baseFare),
      perKmRate: toOptionalDecimal(input.perKmRate),
      perMinuteRate: toOptionalDecimal(input.perMinuteRate),
      minimumFare: toOptionalDecimal(input.minimumFare),
      bookingFee: toOptionalDecimal(input.bookingFee),
      freeWaitingMinutes: input.freeWaitingMinutes,
      waitingFeePerMinute: toOptionalDecimal(input.waitingFeePerMinute),
      priority: input.priority,
      isActive: input.isActive,
    },
    include: farePlanInclude,
  });
}

export async function deleteFarePlan(id: string) {
  return prisma.farePlan.delete({ where: { id } });
}

export function hasDefaultLocaleTranslation(translations: FarePlanTranslationInput[]) {
  return translations.some(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  );
}

function scopeMatches(planScopeId: string | null, requestedId?: string | null) {
  if (!planScopeId) return true;
  if (!requestedId) return false;
  return planScopeId === requestedId;
}

function farePlanSpecificityScore(plan: {
  regionId: string | null;
  vehicleClassId: string | null;
  vehicleTypeId: string | null;
}) {
  return (
    (plan.regionId ? 1 : 0) +
    (plan.vehicleClassId ? 1 : 0) +
    (plan.vehicleTypeId ? 1 : 0)
  );
}

export async function resolveFarePlan(input: ResolveFarePlanInput) {
  const plans = await prisma.farePlan.findMany({
    where: { isActive: true },
    include: farePlanInclude,
    orderBy: [{ priority: "desc" }, { slug: "asc" }],
  });

  const matches = plans
    .filter(
      (plan) =>
        scopeMatches(plan.regionId, input.regionId) &&
        scopeMatches(plan.vehicleClassId, input.vehicleClassId) &&
        scopeMatches(plan.vehicleTypeId, input.vehicleTypeId),
    )
    .sort((left, right) => {
      if (right.priority !== left.priority) {
        return right.priority - left.priority;
      }

      return (
        farePlanSpecificityScore(right) - farePlanSpecificityScore(left) ||
        left.slug.localeCompare(right.slug)
      );
    });

  return matches[0] ?? null;
}
