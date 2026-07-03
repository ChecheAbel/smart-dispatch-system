import type { Prisma } from "../generated/prisma";
import type { Role, RoleTranslation } from "@smart-dispatch/types";
import {
  parseRoleTranslationsMap,
  roleTranslationsMapToArray,
  type RoleTranslationsMap,
} from "../types/role-translations";
import { DEFAULT_LOCALE, normalizeLocale } from "../utils/locale";

type DbRole = {
  id: string;
  slug: string;
  createdAt: Date;
  translations: Prisma.JsonValue;
};

export function pickRoleTranslation(map: RoleTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  return (
    map[preferred] ??
    map[DEFAULT_LOCALE] ??
    Object.values(map)[0] ??
    { name: "", description: null }
  );
}

export function pickRoleLocale(map: RoleTranslationsMap, locale?: string) {
  const preferred = normalizeLocale(locale);
  if (map[preferred]) return preferred;
  if (map[DEFAULT_LOCALE]) return DEFAULT_LOCALE;
  return Object.keys(map)[0] ?? DEFAULT_LOCALE;
}

export function toPublicRole(
  role: DbRole,
  options?: { locale?: string; includeAllTranslations?: boolean },
): Role {
  const translationsMap = parseRoleTranslationsMap(role.translations);
  const locale = pickRoleLocale(translationsMap, options?.locale);
  const translation = pickRoleTranslation(translationsMap, options?.locale);

  const result: Role = {
    id: role.id,
    slug: role.slug,
    name: translation.name,
    description: translation.description,
    locale,
    created_at: role.createdAt.toISOString(),
  };

  if (options?.includeAllTranslations) {
    result.translations = roleTranslationsMapToArray(translationsMap);
  }

  return result;
}

export function toPublicRoleTranslation(
  locale: string,
  value: { name: string; description: string | null },
): RoleTranslation {
  return {
    locale,
    name: value.name,
    description: value.description,
  };
}
