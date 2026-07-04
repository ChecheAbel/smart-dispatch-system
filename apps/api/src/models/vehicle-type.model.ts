import { Prisma, VehicleStatus } from "../generated/prisma";
import { prisma } from "../db/prisma";
import {
  mergeVehicleTypeTranslations,
  parseVehicleTypeTranslationsMap,
  vehicleTypeTranslationInputsToMap,
  type VehicleTypeTranslationInput,
  type VehicleTypeTranslationsMap,
} from "../types/vehicle-type-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";
import { generateSlugFromText } from "../utils/slug";

export type { VehicleTypeTranslationInput };

export type CreateVehicleTypeInput = {
  translations: VehicleTypeTranslationInput[];
  passengerCapacity?: number | null;
  isActive?: boolean;
};

export type UpdateVehicleTypeInput = {
  translations?: VehicleTypeTranslationInput[];
  passengerCapacity?: number | null;
  isActive?: boolean;
};

export type ListVehicleTypesFilter = {
  search?: string;
  isActive?: boolean;
};

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function toJsonTranslations(translations: VehicleTypeTranslationsMap): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

export function slugFromVehicleTypeTranslations(translations: VehicleTypeTranslationInput[]) {
  const englishName = translations.find(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  )?.name;

  return englishName ? generateSlugFromText(englishName) : "";
}

async function ensureUniqueVehicleTypeSlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (await prisma.vehicleType.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function findVehicleTypeById(id: string) {
  return prisma.vehicleType.findUnique({ where: { id } });
}

export async function findVehicleTypeBySlug(slug: string) {
  return prisma.vehicleType.findUnique({ where: { slug: normalizeSlug(slug) } });
}

export async function listVehicleTypes(
  filter?: ListVehicleTypesFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;
  const search = filter?.search?.trim();

  return prisma.vehicleType.findMany({
    where: {
      ...(filter?.isActive === undefined ? {} : { isActive: filter.isActive }),
      ...(search
        ? {
            slug: { contains: search, mode: "insensitive" },
          }
        : {}),
    },
    skip,
    take,
    orderBy: { slug: "asc" },
  });
}

export async function countVehicleTypes(filter?: ListVehicleTypesFilter) {
  const search = filter?.search?.trim();

  return prisma.vehicleType.count({
    where: {
      ...(filter?.isActive === undefined ? {} : { isActive: filter.isActive }),
      ...(search
        ? {
            slug: { contains: search, mode: "insensitive" },
          }
        : {}),
    },
  });
}

export async function listActiveVehicleTypes() {
  return prisma.vehicleType.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" },
  });
}

export async function createVehicleType(input: CreateVehicleTypeInput) {
  const translations = vehicleTypeTranslationInputsToMap(input.translations);
  const baseSlug = slugFromVehicleTypeTranslations(input.translations);

  if (!baseSlug) {
    throw new Error("VEHICLE_TYPE_SLUG_REQUIRED");
  }

  const slug = await ensureUniqueVehicleTypeSlug(baseSlug);

  return prisma.vehicleType.create({
    data: {
      slug,
      translations: toJsonTranslations(translations),
      passengerCapacity: input.passengerCapacity ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateVehicleType(id: string, input: UpdateVehicleTypeInput) {
  let translationsUpdate: VehicleTypeTranslationsMap | undefined;

  if (input.translations?.length) {
    const existing = await prisma.vehicleType.findUnique({ where: { id } });
    const currentTranslations = parseVehicleTypeTranslationsMap(existing?.translations);
    translationsUpdate = mergeVehicleTypeTranslations(
      currentTranslations,
      vehicleTypeTranslationInputsToMap(input.translations),
    );
  }

  return prisma.vehicleType.update({
    where: { id },
    data: {
      translations: translationsUpdate
        ? toJsonTranslations(translationsUpdate)
        : undefined,
      passengerCapacity: input.passengerCapacity,
      isActive: input.isActive,
    },
  });
}

export async function deleteVehicleType(id: string) {
  return prisma.vehicleType.delete({ where: { id } });
}

export function hasDefaultLocaleTranslation(translations: VehicleTypeTranslationInput[]) {
  return translations.some(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  );
}

export async function countVehiclesByTypeId(vehicleTypeId: string) {
  return prisma.vehicle.count({ where: { vehicleTypeId } });
}
