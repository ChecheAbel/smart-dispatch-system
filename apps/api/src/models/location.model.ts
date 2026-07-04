import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import {
  mergeRegionTranslations,
  parseRegionTranslationsMap,
  regionTranslationInputsToMap,
  type RegionTranslationInput,
  type RegionTranslationsMap,
} from "../types/region-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

export type { RegionTranslationInput as LocationTranslationInput };

export type CreateLocationInput = {
  regionId: string;
  translations: RegionTranslationInput[];
  latitude: number;
  longitude: number;
  address?: string | null;
  isActive?: boolean;
};

export type UpdateLocationInput = {
  regionId?: string;
  translations?: RegionTranslationInput[];
  latitude?: number;
  longitude?: number;
  address?: string | null;
  isActive?: boolean;
};

export type ListLocationsFilter = {
  search?: string;
  regionId?: string;
  isActive?: boolean;
};

const locationInclude = {
  region: true,
} as const;

function toJsonTranslations(translations: RegionTranslationsMap): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

function toDecimal(value: number) {
  return new Prisma.Decimal(value);
}

export function parseCoordinate(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  if (value < min || value > max) return undefined;
  return value;
}

export function parseLatitude(value: unknown) {
  return parseCoordinate(value, -90, 90);
}

export function parseLongitude(value: unknown) {
  return parseCoordinate(value, -180, 180);
}

function buildLocationWhere(filter?: ListLocationsFilter) {
  const search = filter?.search?.trim();

  return {
    ...(filter?.regionId ? { regionId: filter.regionId } : {}),
    ...(filter?.isActive === undefined ? {} : { isActive: filter.isActive }),
    ...(search
      ? {
          address: { contains: search, mode: "insensitive" as const },
        }
      : {}),
  };
}

export async function findLocationById(id: string) {
  return prisma.location.findUnique({
    where: { id },
    include: locationInclude,
  });
}

export async function listLocations(
  filter?: ListLocationsFilter,
  options?: { skip?: number; take?: number },
) {
  return prisma.location.findMany({
    where: buildLocationWhere(filter),
    include: locationInclude,
    skip: options?.skip ?? 0,
    take: options?.take ?? 20,
    orderBy: { createdAt: "desc" },
  });
}

export async function countLocations(filter?: ListLocationsFilter) {
  return prisma.location.count({
    where: buildLocationWhere(filter),
  });
}

export async function createLocation(input: CreateLocationInput) {
  const translations = regionTranslationInputsToMap(input.translations);

  return prisma.location.create({
    data: {
      regionId: input.regionId,
      translations: toJsonTranslations(translations),
      latitude: toDecimal(input.latitude),
      longitude: toDecimal(input.longitude),
      address: input.address?.trim() || null,
      isActive: input.isActive ?? true,
    },
    include: locationInclude,
  });
}

export async function updateLocation(id: string, input: UpdateLocationInput) {
  let translationsUpdate: RegionTranslationsMap | undefined;

  if (input.translations?.length) {
    const existing = await prisma.location.findUnique({ where: { id } });
    const currentTranslations = parseRegionTranslationsMap(existing?.translations);
    translationsUpdate = mergeRegionTranslations(
      currentTranslations,
      regionTranslationInputsToMap(input.translations),
    );
  }

  return prisma.location.update({
    where: { id },
    data: {
      regionId: input.regionId,
      translations: translationsUpdate
        ? toJsonTranslations(translationsUpdate)
        : undefined,
      latitude: input.latitude === undefined ? undefined : toDecimal(input.latitude),
      longitude: input.longitude === undefined ? undefined : toDecimal(input.longitude),
      address: input.address,
      isActive: input.isActive,
    },
    include: locationInclude,
  });
}

export async function deleteLocation(id: string) {
  return prisma.location.delete({ where: { id } });
}

export function hasDefaultLocaleTranslation(translations: RegionTranslationInput[]) {
  return translations.some(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  );
}
