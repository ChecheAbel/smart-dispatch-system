import { LateCancellationType, Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import {
  bookingPolicyTranslationInputsToMap,
  mergeBookingPolicyTranslations,
  parseBookingPolicyTranslationsMap,
  type BookingPolicyTranslationInput,
  type BookingPolicyTranslationsMap,
} from "../types/booking-policy-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";
import { generateSlugFromText } from "../utils/slug";

export type { BookingPolicyTranslationInput };

export type CreateBookingPolicyInput = {
  translations: BookingPolicyTranslationInput[];
  minAdvanceBookingHours?: number;
  maxAdvanceBookingHours?: number;
  freeCancellationHours?: number;
  lateCancellationType?: LateCancellationType;
  lateCancellationFee?: number | null;
  currency?: string;
  isActive?: boolean;
};

export type UpdateBookingPolicyInput = {
  translations?: BookingPolicyTranslationInput[];
  minAdvanceBookingHours?: number;
  maxAdvanceBookingHours?: number;
  freeCancellationHours?: number;
  lateCancellationType?: LateCancellationType;
  lateCancellationFee?: number | null;
  currency?: string;
  isActive?: boolean;
};

export type ListBookingPoliciesFilter = {
  search?: string;
  isActive?: boolean;
};

function toJsonTranslations(translations: BookingPolicyTranslationsMap): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

function toOptionalDecimal(value: number | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Prisma.Decimal(value);
}

function normalizeHours(value: number | undefined, fallback = 0) {
  if (value === undefined) return fallback;
  return Math.max(0, Math.trunc(value));
}

export function slugFromBookingPolicyTranslations(translations: BookingPolicyTranslationInput[]) {
  const englishName = translations.find(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  )?.name;

  return englishName ? generateSlugFromText(englishName) : "";
}

export function hasDefaultLocaleTranslation(translations: BookingPolicyTranslationInput[]) {
  return translations.some(
    (translation) =>
      normalizeLocale(translation.locale) === DEFAULT_LOCALE && translation.name.trim().length > 0,
  );
}

async function ensureUniqueBookingPolicySlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (await prisma.bookingPolicy.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function findBookingPolicyById(id: string) {
  return prisma.bookingPolicy.findUnique({ where: { id } });
}

export async function listBookingPolicies(
  filter?: ListBookingPoliciesFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;
  const search = filter?.search?.trim().toLowerCase();

  return prisma.bookingPolicy.findMany({
    where: {
      ...(filter?.isActive === undefined ? {} : { isActive: filter.isActive }),
      ...(search
        ? {
            OR: [
              { slug: { contains: search, mode: "insensitive" } },
              {
                translations: {
                  path: [],
                  string_contains: search,
                },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ slug: "asc" }],
    skip,
    take,
  });
}

export async function listActiveBookingPolicies() {
  return prisma.bookingPolicy.findMany({
    where: { isActive: true },
    orderBy: [{ slug: "asc" }],
  });
}

export async function countBookingPolicies(filter?: ListBookingPoliciesFilter) {
  const search = filter?.search?.trim().toLowerCase();

  return prisma.bookingPolicy.count({
    where: {
      ...(filter?.isActive === undefined ? {} : { isActive: filter.isActive }),
      ...(search
        ? {
            OR: [
              { slug: { contains: search, mode: "insensitive" } },
              {
                translations: {
                  path: [],
                  string_contains: search,
                },
              },
            ],
          }
        : {}),
    },
  });
}

export async function countContractsByBookingPolicyId(bookingPolicyId: string) {
  return prisma.contract.count({ where: { bookingPolicyId } });
}

export async function createBookingPolicy(input: CreateBookingPolicyInput) {
  const translationsMap = bookingPolicyTranslationInputsToMap(input.translations);
  const baseSlug = slugFromBookingPolicyTranslations(input.translations);

  if (!baseSlug) {
    throw new Error("BOOKING_POLICY_SLUG_REQUIRED");
  }

  const slug = await ensureUniqueBookingPolicySlug(baseSlug);

  return prisma.bookingPolicy.create({
    data: {
      slug,
      translations: toJsonTranslations(translationsMap),
      minAdvanceBookingHours: normalizeHours(input.minAdvanceBookingHours),
      maxAdvanceBookingHours: normalizeHours(input.maxAdvanceBookingHours, 720),
      freeCancellationHours: normalizeHours(input.freeCancellationHours),
      lateCancellationType: input.lateCancellationType ?? LateCancellationType.none,
      lateCancellationFee: toOptionalDecimal(input.lateCancellationFee ?? null),
      currency: input.currency?.trim().toUpperCase() || "ETB",
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateBookingPolicy(id: string, input: UpdateBookingPolicyInput) {
  const existing = await prisma.bookingPolicy.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("BOOKING_POLICY_NOT_FOUND");
  }

  const existingTranslations = parseBookingPolicyTranslationsMap(existing.translations);
  const nextTranslations = input.translations?.length
    ? mergeBookingPolicyTranslations(
        existingTranslations,
        bookingPolicyTranslationInputsToMap(input.translations),
      )
    : undefined;

  let slug: string | undefined;
  if (input.translations?.length) {
    const baseSlug = slugFromBookingPolicyTranslations(input.translations);
    if (!baseSlug) {
      throw new Error("BOOKING_POLICY_SLUG_REQUIRED");
    }
    slug =
      baseSlug === existing.slug
        ? existing.slug
        : await ensureUniqueBookingPolicySlug(baseSlug);
  }

  return prisma.bookingPolicy.update({
    where: { id },
    data: {
      slug,
      translations: nextTranslations ? toJsonTranslations(nextTranslations) : undefined,
      minAdvanceBookingHours:
        input.minAdvanceBookingHours === undefined
          ? undefined
          : normalizeHours(input.minAdvanceBookingHours),
      maxAdvanceBookingHours:
        input.maxAdvanceBookingHours === undefined
          ? undefined
          : normalizeHours(input.maxAdvanceBookingHours),
      freeCancellationHours:
        input.freeCancellationHours === undefined
          ? undefined
          : normalizeHours(input.freeCancellationHours),
      lateCancellationType: input.lateCancellationType,
      lateCancellationFee:
        input.lateCancellationFee === undefined
          ? undefined
          : toOptionalDecimal(input.lateCancellationFee),
      currency: input.currency?.trim().toUpperCase(),
      isActive: input.isActive,
    },
  });
}

export async function deleteBookingPolicy(id: string) {
  return prisma.bookingPolicy.delete({ where: { id } });
}
