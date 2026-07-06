import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import {
  mergeVehicleClassTranslations,
  parseVehicleClassTranslationsMap,
  vehicleClassTranslationInputsToMap,
  type VehicleClassTranslationInput,
  type VehicleClassTranslationsMap,
} from "../types/vehicle-class-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";
import { generateSlugFromText } from "../utils/slug";

export type { VehicleClassTranslationInput };

export type CreateVehicleClassInput = {
  translations: VehicleClassTranslationInput[];
  isActive?: boolean;
};

export type UpdateVehicleClassInput = {
  translations?: VehicleClassTranslationInput[];
  isActive?: boolean;
};

export type ListVehicleClassesFilter = {
  search?: string;
  isActive?: boolean;
};

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function toJsonTranslations(translations: VehicleClassTranslationsMap): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

export function slugFromVehicleClassTranslations(translations: VehicleClassTranslationInput[]) {
  const englishName = translations.find(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  )?.name;

  return englishName ? generateSlugFromText(englishName) : "";
}

async function ensureUniqueVehicleClassSlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (await prisma.vehicleClass.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export async function findVehicleClassById(id: string) {
  return prisma.vehicleClass.findUnique({ where: { id } });
}

export async function findVehicleClassBySlug(slug: string) {
  return prisma.vehicleClass.findUnique({ where: { slug: normalizeSlug(slug) } });
}

export async function listVehicleClasses(
  filter?: ListVehicleClassesFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;
  const search = filter?.search?.trim();

  return prisma.vehicleClass.findMany({
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

export async function countVehicleClasses(filter?: ListVehicleClassesFilter) {
  const search = filter?.search?.trim();

  return prisma.vehicleClass.count({
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

export async function listActiveVehicleClasses() {
  return prisma.vehicleClass.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" },
  });
}

export async function createVehicleClass(input: CreateVehicleClassInput) {
  const translations = vehicleClassTranslationInputsToMap(input.translations);
  const baseSlug = slugFromVehicleClassTranslations(input.translations);

  if (!baseSlug) {
    throw new Error("VEHICLE_CLASS_SLUG_REQUIRED");
  }

  const slug = await ensureUniqueVehicleClassSlug(baseSlug);

  return prisma.vehicleClass.create({
    data: {
      slug,
      translations: toJsonTranslations(translations),
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateVehicleClass(id: string, input: UpdateVehicleClassInput) {
  let translationsUpdate: VehicleClassTranslationsMap | undefined;

  if (input.translations?.length) {
    const existing = await prisma.vehicleClass.findUnique({ where: { id } });
    const currentTranslations = parseVehicleClassTranslationsMap(existing?.translations);
    translationsUpdate = mergeVehicleClassTranslations(
      currentTranslations,
      vehicleClassTranslationInputsToMap(input.translations),
    );
  }

  return prisma.vehicleClass.update({
    where: { id },
    data: {
      translations: translationsUpdate
        ? toJsonTranslations(translationsUpdate)
        : undefined,
      isActive: input.isActive,
    },
  });
}

export async function deleteVehicleClass(id: string) {
  return prisma.vehicleClass.delete({ where: { id } });
}

export function hasDefaultLocaleTranslation(translations: VehicleClassTranslationInput[]) {
  return translations.some(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  );
}

export async function countVehiclesByClassId(vehicleClassId: string) {
  return prisma.vehicle.count({ where: { vehicleClassId } });
}

export async function countFarePlansByClassId(vehicleClassId: string) {
  return prisma.farePlan.count({ where: { vehicleClassId } });
}
