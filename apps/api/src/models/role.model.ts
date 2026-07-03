import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import {
  mergeRoleTranslations,
  parseRoleTranslationsMap,
  roleTranslationInputsToMap,
  type RoleTranslationInput,
  type RoleTranslationsMap,
} from "../types/role-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

export type { RoleTranslationInput };

export type CreateRoleInput = {
  slug: string;
  translations: RoleTranslationInput[];
};

export type UpdateRoleInput = {
  slug?: string;
  translations?: RoleTranslationInput[];
};

export type ListRolesFilter = {
  search?: string;
};

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function toJsonTranslations(translations: RoleTranslationsMap): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

async function listRolesWithSearch(search: string, skip: number, take: number) {
  const pattern = `%${search}%`;

  return prisma.$queryRaw<
    Array<{
      id: string;
      slug: string;
      translations: Prisma.JsonValue;
      createdAt: Date;
    }>
  >`
    SELECT id, slug, translations, created_at AS "createdAt"
    FROM roles
    WHERE slug ILIKE ${pattern} OR translations::text ILIKE ${pattern}
    ORDER BY slug ASC
    LIMIT ${take} OFFSET ${skip}
  `;
}

async function countRolesWithSearch(search: string) {
  const pattern = `%${search}%`;
  const result = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count
    FROM roles
    WHERE slug ILIKE ${pattern} OR translations::text ILIKE ${pattern}
  `;

  return Number(result[0]?.count ?? 0);
}

export async function findRoleById(id: string) {
  return prisma.role.findUnique({ where: { id } });
}

export async function findRoleBySlug(slug: string) {
  return prisma.role.findUnique({ where: { slug: normalizeSlug(slug) } });
}

export async function listRoles(
  filter?: ListRolesFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;

  if (filter?.search?.trim()) {
    return listRolesWithSearch(filter.search.trim(), skip, take);
  }

  return prisma.role.findMany({
    skip,
    take,
    orderBy: { slug: "asc" },
  });
}

export async function countRoles(filter?: ListRolesFilter) {
  if (filter?.search?.trim()) {
    return countRolesWithSearch(filter.search.trim());
  }

  return prisma.role.count();
}

export async function findRolesByUserId(userId: string) {
  const authRoles = await prisma.authRole.findMany({
    where: { userId },
    include: { role: true },
  });

  return authRoles
    .map((authRole) => authRole.role)
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

export async function findUsersByRoleId(roleId: string) {
  const authRoles = await prisma.authRole.findMany({
    where: { roleId },
    include: {
      user: {
        include: {
          authRoles: {
            include: { role: true },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  return authRoles.map((authRole) => authRole.user);
}

export async function createRole(input: CreateRoleInput) {
  const translations = roleTranslationInputsToMap(input.translations);

  return prisma.role.create({
    data: {
      slug: normalizeSlug(input.slug),
      translations: toJsonTranslations(translations),
    },
  });
}

export async function updateRole(roleId: string, input: UpdateRoleInput) {
  let translationsUpdate: RoleTranslationsMap | undefined;

  if (input.translations?.length) {
    const existing = await prisma.role.findUnique({ where: { id: roleId } });
    const currentTranslations = parseRoleTranslationsMap(existing?.translations);
    translationsUpdate = mergeRoleTranslations(
      currentTranslations,
      roleTranslationInputsToMap(input.translations),
    );
  }

  return prisma.role.update({
    where: { id: roleId },
    data: {
      slug: input.slug === undefined ? undefined : normalizeSlug(input.slug),
      translations: translationsUpdate
        ? toJsonTranslations(translationsUpdate)
        : undefined,
    },
  });
}

export async function deleteRole(roleId: string) {
  return prisma.role.delete({ where: { id: roleId } });
}

export function hasDefaultLocaleTranslation(translations: RoleTranslationInput[]) {
  return translations.some(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  );
}
