import type { SupportedLocale } from "@/lib/locale";
import am from "./am/translation.json";
import en from "./en/translation.json";
import type {
  AdminEndpointsMessages,
  AdminMenusMessages,
  AdminPermissionsMessages,
  AdminRolesMessages,
  Translations,
} from "./types";

const translations: Record<SupportedLocale, Translations> = {
  en,
  am,
};

export type {
  AdminEndpointsMessages,
  AdminMenusMessages,
  AdminPermissionsMessages,
  AdminRolesMessages,
  Translations,
};
export { formatMessage } from "./format";

export function getTranslations(locale: SupportedLocale): Translations {
  return translations[locale];
}

export function getAdminRolesMessages(locale: SupportedLocale): AdminRolesMessages {
  return getTranslations(locale).adminRoles;
}

export function getAdminEndpointsMessages(locale: SupportedLocale): AdminEndpointsMessages {
  return getTranslations(locale).adminEndpoints;
}

export function getAdminMenusMessages(locale: SupportedLocale): AdminMenusMessages {
  return getTranslations(locale).adminMenus;
}

export function getAdminPermissionsMessages(locale: SupportedLocale): AdminPermissionsMessages {
  return getTranslations(locale).adminPermissions;
}
