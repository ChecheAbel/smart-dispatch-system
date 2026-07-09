import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import {
  maintenanceWorkTypeTranslationInputsToMap,
  mergeMaintenanceWorkTypeTranslations,
  parseMaintenanceWorkTypeTranslationsMap,
  type MaintenanceWorkTypeTranslationInput,
  type MaintenanceWorkTypeTranslationsMap,
} from "../types/maintenance-work-type-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";
import { generateSlugFromText } from "../utils/slug";

export type { MaintenanceWorkTypeTranslationInput };

export type CreateMaintenanceWorkTypeInput = {
  translations: MaintenanceWorkTypeTranslationInput[];
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateMaintenanceWorkTypeInput = {
  translations?: MaintenanceWorkTypeTranslationInput[];
  isActive?: boolean;
  sortOrder?: number;
};

export type ListMaintenanceWorkTypesFilter = {
  search?: string;
  isActive?: boolean;
};

function toJsonTranslations(translations: MaintenanceWorkTypeTranslationsMap): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

export function slugFromMaintenanceWorkTypeTranslations(
  translations: MaintenanceWorkTypeTranslationInput[],
) {
  const englishName = translations.find(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  )?.name;

  return englishName ? generateSlugFromText(englishName) : "";
}

async function ensureUniqueMaintenanceWorkTypeSlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (await prisma.maintenanceWorkType.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

export function hasDefaultLocaleTranslation(translations: MaintenanceWorkTypeTranslationInput[]) {
  return translations.some(
    (translation) =>
      normalizeLocale(translation.locale) === DEFAULT_LOCALE && translation.name.trim().length > 0,
  );
}

export async function findMaintenanceWorkTypeById(id: string) {
  return prisma.maintenanceWorkType.findUnique({ where: { id } });
}

export async function findMaintenanceWorkTypeBySlug(slug: string) {
  return prisma.maintenanceWorkType.findUnique({ where: { slug: normalizeSlug(slug) } });
}

export async function listMaintenanceWorkTypes(
  filter?: ListMaintenanceWorkTypesFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;
  const search = filter?.search?.trim().toLowerCase();

  return prisma.maintenanceWorkType.findMany({
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
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
    skip,
    take,
  });
}

export async function listActiveMaintenanceWorkTypes() {
  return prisma.maintenanceWorkType.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });
}

export async function countMaintenanceWorkTypes(filter?: ListMaintenanceWorkTypesFilter) {
  const search = filter?.search?.trim().toLowerCase();

  return prisma.maintenanceWorkType.count({
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

export async function countMaintenanceLogsByWorkTypeId(workTypeId: string) {
  return prisma.vehicleMaintenanceLog.count({ where: { workTypeId } });
}

export async function createMaintenanceWorkType(input: CreateMaintenanceWorkTypeInput) {
  const translationsMap = maintenanceWorkTypeTranslationInputsToMap(input.translations);
  const baseSlug = slugFromMaintenanceWorkTypeTranslations(input.translations);

  if (!baseSlug) {
    throw new Error("MAINTENANCE_WORK_TYPE_SLUG_REQUIRED");
  }

  const slug = await ensureUniqueMaintenanceWorkTypeSlug(baseSlug);

  return prisma.maintenanceWorkType.create({
    data: {
      slug,
      translations: toJsonTranslations(translationsMap),
      isActive: input.isActive ?? true,
      sortOrder: input.sortOrder ?? 0,
    },
  });
}

export async function updateMaintenanceWorkType(id: string, input: UpdateMaintenanceWorkTypeInput) {
  const existing = await prisma.maintenanceWorkType.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("MAINTENANCE_WORK_TYPE_NOT_FOUND");
  }

  const existingTranslations = parseMaintenanceWorkTypeTranslationsMap(existing.translations);
  const nextTranslations = input.translations?.length
    ? mergeMaintenanceWorkTypeTranslations(
        existingTranslations,
        maintenanceWorkTypeTranslationInputsToMap(input.translations),
      )
    : undefined;

  let slug: string | undefined;
  if (input.translations?.length) {
    const baseSlug = slugFromMaintenanceWorkTypeTranslations(input.translations);
    if (!baseSlug) {
      throw new Error("MAINTENANCE_WORK_TYPE_SLUG_REQUIRED");
    }
    if (baseSlug !== existing.slug) {
      slug = await ensureUniqueMaintenanceWorkTypeSlug(baseSlug);
    }
  }

  return prisma.maintenanceWorkType.update({
    where: { id },
    data: {
      ...(slug ? { slug } : {}),
      ...(nextTranslations ? { translations: toJsonTranslations(nextTranslations) } : {}),
      ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
    },
  });
}

export async function deleteMaintenanceWorkType(id: string) {
  return prisma.maintenanceWorkType.delete({ where: { id } });
}

export async function resolveMaintenanceWorkTypeId(input: {
  workTypeId?: unknown;
  workTypeSlug?: unknown;
  type?: unknown;
}) {
  const rawId = typeof input.workTypeId === "string" ? input.workTypeId.trim() : "";
  if (rawId) {
    const workType = await findMaintenanceWorkTypeById(rawId);
    if (!workType || !workType.isActive) return null;
    return workType.id;
  }

  const rawSlug =
    typeof input.workTypeSlug === "string"
      ? input.workTypeSlug
      : typeof input.type === "string"
        ? input.type
        : "";
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) return null;

  const workType = await findMaintenanceWorkTypeBySlug(slug);
  if (!workType || !workType.isActive) return null;
  return workType.id;
}
