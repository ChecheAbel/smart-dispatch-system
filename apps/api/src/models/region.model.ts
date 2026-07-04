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
import { generateSlugFromText } from "../utils/slug";

export type { RegionTranslationInput };

export type CreateRegionInput = {
  translations: RegionTranslationInput[];
  isActive?: boolean;
};

export type UpdateRegionInput = {
  translations?: RegionTranslationInput[];
  isActive?: boolean;
};

export type ListRegionsFilter = {
  search?: string;
  isActive?: boolean;
};

function toJsonTranslations(translations: RegionTranslationsMap): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

export function slugFromRegionTranslations(translations: RegionTranslationInput[]) {
  const englishName = translations.find(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  )?.name;

  return englishName ? generateSlugFromText(englishName) : "";
}

async function ensureUniqueRegionSlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (await prisma.region.findUnique({ where: { slug: candidate } })) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function listRegionsWithSearch(search: string, skip: number, take: number) {
  const pattern = `%${search}%`;

  return prisma.$queryRaw<
    Array<{
      id: string;
      slug: string;
      translations: Prisma.JsonValue;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    SELECT id, slug, translations, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
    FROM regions
    WHERE slug ILIKE ${pattern} OR translations::text ILIKE ${pattern}
    ORDER BY slug ASC
    LIMIT ${take} OFFSET ${skip}
  `;
}

async function countRegionsWithSearch(search: string) {
  const pattern = `%${search}%`;
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count
    FROM regions
    WHERE slug ILIKE ${pattern} OR translations::text ILIKE ${pattern}
  `;

  return Number(result[0]?.count ?? 0);
}

export async function findRegionById(id: string) {
  return prisma.region.findUnique({ where: { id } });
}

export async function listRegions(
  filter?: ListRegionsFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;
  const search = filter?.search?.trim();

  if (search) {
    return listRegionsWithSearch(search, skip, take);
  }

  return prisma.region.findMany({
    where: {
      ...(filter?.isActive === undefined ? {} : { isActive: filter.isActive }),
    },
    skip,
    take,
    orderBy: { slug: "asc" },
  });
}

export async function countRegions(filter?: ListRegionsFilter) {
  const search = filter?.search?.trim();

  if (search) {
    return countRegionsWithSearch(search);
  }

  return prisma.region.count({
    where: {
      ...(filter?.isActive === undefined ? {} : { isActive: filter.isActive }),
    },
  });
}

export async function listActiveRegions() {
  return prisma.region.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" },
  });
}

export async function createRegion(input: CreateRegionInput) {
  const translations = regionTranslationInputsToMap(input.translations);
  const baseSlug = slugFromRegionTranslations(input.translations);

  if (!baseSlug) {
    throw new Error("REGION_SLUG_REQUIRED");
  }

  const slug = await ensureUniqueRegionSlug(baseSlug);

  return prisma.region.create({
    data: {
      slug,
      translations: toJsonTranslations(translations),
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateRegion(id: string, input: UpdateRegionInput) {
  let translationsUpdate: RegionTranslationsMap | undefined;

  if (input.translations?.length) {
    const existing = await prisma.region.findUnique({ where: { id } });
    const currentTranslations = parseRegionTranslationsMap(existing?.translations);
    translationsUpdate = mergeRegionTranslations(
      currentTranslations,
      regionTranslationInputsToMap(input.translations),
    );
  }

  return prisma.region.update({
    where: { id },
    data: {
      translations: translationsUpdate
        ? toJsonTranslations(translationsUpdate)
        : undefined,
      isActive: input.isActive,
    },
  });
}

export async function deleteRegion(id: string) {
  return prisma.region.delete({ where: { id } });
}

export function hasDefaultLocaleTranslation(translations: RegionTranslationInput[]) {
  return translations.some(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  );
}

export async function countLocationsByRegionId(regionId: string) {
  return prisma.location.count({ where: { regionId } });
}
