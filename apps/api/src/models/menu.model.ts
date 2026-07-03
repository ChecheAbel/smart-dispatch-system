import { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";
import {
  mergeMenuTranslations,
  menuTranslationInputsToMap,
  parseMenuTranslationsMap,
  type MenuTranslationInput,
  type MenuTranslationsMap,
} from "../types/menu-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";
import { findPermissionsByUserId } from "./permission.model";

export type { MenuTranslationInput };

export type CreateMenuInput = {
  slug: string;
  path?: string | null;
  icon?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  permissionId?: string | null;
  translations: MenuTranslationInput[];
  isActive?: boolean;
};

export type UpdateMenuInput = {
  slug?: string;
  path?: string | null;
  icon?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  permissionId?: string | null;
  translations?: MenuTranslationInput[];
  isActive?: boolean;
};

export type ListMenusFilter = {
  search?: string;
  isActive?: boolean;
};

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function toJsonTranslations(translations: MenuTranslationsMap): Prisma.InputJsonValue {
  return translations as Prisma.InputJsonValue;
}

export async function findMenuById(id: string) {
  return prisma.menu.findUnique({ where: { id } });
}

export async function findMenuBySlug(slug: string) {
  return prisma.menu.findUnique({ where: { slug: normalizeSlug(slug) } });
}

export async function listMenus(
  filter?: ListMenusFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;
  const search = filter?.search?.trim();

  return prisma.menu.findMany({
    where: {
      AND: [
        filter?.isActive === undefined ? {} : { isActive: filter.isActive },
        search
          ? {
              OR: [
                { slug: { contains: search, mode: "insensitive" } },
                { path: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    skip,
    take,
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });
}

export async function countMenus(filter?: ListMenusFilter) {
  const search = filter?.search?.trim();

  return prisma.menu.count({
    where: {
      AND: [
        filter?.isActive === undefined ? {} : { isActive: filter.isActive },
        search
          ? {
              OR: [
                { slug: { contains: search, mode: "insensitive" } },
                { path: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
  });
}

export async function listActiveMenus() {
  return prisma.menu.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });
}

export async function listMenusForUser(userId: string) {
  const [menus, permissions] = await Promise.all([
    listActiveMenus(),
    findPermissionsByUserId(userId),
  ]);

  const permissionIds = new Set(permissions.map((permission) => permission.id));

  return menus.filter(
    (menu) => !menu.permissionId || permissionIds.has(menu.permissionId),
  );
}

export async function createMenu(input: CreateMenuInput) {
  const translations = menuTranslationInputsToMap(input.translations);

  return prisma.menu.create({
    data: {
      slug: normalizeSlug(input.slug),
      path: input.path?.trim() || null,
      icon: input.icon?.trim() || null,
      parentId: input.parentId ?? null,
      sortOrder: input.sortOrder ?? 0,
      permissionId: input.permissionId ?? null,
      translations: toJsonTranslations(translations),
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateMenu(menuId: string, input: UpdateMenuInput) {
  let translationsUpdate: MenuTranslationsMap | undefined;

  if (input.translations?.length) {
    const existing = await prisma.menu.findUnique({ where: { id: menuId } });
    const currentTranslations = parseMenuTranslationsMap(existing?.translations);
    translationsUpdate = mergeMenuTranslations(
      currentTranslations,
      menuTranslationInputsToMap(input.translations),
    );
  }

  return prisma.menu.update({
    where: { id: menuId },
    data: {
      slug: input.slug === undefined ? undefined : normalizeSlug(input.slug),
      path: input.path === undefined ? undefined : input.path?.trim() || null,
      icon: input.icon === undefined ? undefined : input.icon?.trim() || null,
      parentId: input.parentId === undefined ? undefined : input.parentId,
      sortOrder: input.sortOrder,
      permissionId: input.permissionId === undefined ? undefined : input.permissionId,
      translations: translationsUpdate
        ? toJsonTranslations(translationsUpdate)
        : undefined,
      isActive: input.isActive,
    },
  });
}

export async function deleteMenu(menuId: string) {
  return prisma.menu.delete({ where: { id: menuId } });
}

export function hasDefaultLocaleMenuTranslation(translations: MenuTranslationInput[]) {
  return translations.some(
    (translation) => normalizeLocale(translation.locale) === DEFAULT_LOCALE,
  );
}
