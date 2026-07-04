import type { Prisma } from "../generated/prisma";
import type { Menu, MenuTranslation } from "@smart-dispatch/types";
import {
  menuTranslationsMapToArray,
  parseMenuTranslationsMap,
  type MenuTranslationsMap,
} from "../types/menu-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

type DbMenu = {
  id: string;
  slug: string;
  path: string | null;
  icon: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  translations: Prisma.JsonValue;
  menuPermissions?: Array<{ permissionId: string }>;
};

export function pickMenuTranslation(map: MenuTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  return map[preferred] ?? map[DEFAULT_LOCALE] ?? Object.values(map)[0] ?? { label: "" };
}

export function pickMenuLocale(map: MenuTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  if (map[preferred]) return preferred;
  if (map[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  return Object.keys(map)[0] ?? DEFAULT_LOCALE;
}

export function toPublicMenu(
  menu: DbMenu,
  options?: { locale?: string; includeAllTranslations?: boolean },
): Menu {
  const translationsMap = parseMenuTranslationsMap(menu.translations);
  const locale = pickMenuLocale(translationsMap, options?.locale);
  const translation = pickMenuTranslation(translationsMap, options?.locale);

  const result: Menu = {
    id: menu.id,
    slug: menu.slug,
    label: translation.label,
    locale,
    path: menu.path,
    icon: menu.icon,
    parent_id: menu.parentId,
    sort_order: menu.sortOrder,
    permission_ids: menu.menuPermissions?.map((entry) => entry.permissionId) ?? [],
    is_active: menu.isActive,
    created_at: menu.createdAt.toISOString(),
  };

  if (options?.includeAllTranslations) {
    result.translations = menuTranslationsMapToArray(translationsMap);
  }

  return result;
}

export function buildMenuTree(menus: Menu[]): Menu[] {
  const nodes = new Map(
    menus.map((menu) => [menu.id, { ...menu, children: [] as Menu[] }]),
  );
  const roots: Menu[] = [];

  for (const menu of nodes.values()) {
    if (menu.parent_id && nodes.has(menu.parent_id)) {
      nodes.get(menu.parent_id)!.children!.push(menu);
      continue;
    }
    roots.push(menu);
  }

  return pruneEmptyGroupMenus(roots);
}

function pruneEmptyGroupMenus(menus: Menu[]): Menu[] {
  return menus
    .map((menu) => ({
      ...menu,
      children: menu.children?.length ? pruneEmptyGroupMenus(menu.children) : undefined,
    }))
    .filter((menu) => menu.path || (menu.children && menu.children.length > 0));
}

export function toPublicMenuTranslation(
  locale: string,
  value: { label: string },
): MenuTranslation {
  return {
    locale,
    label: value.label,
  };
}
