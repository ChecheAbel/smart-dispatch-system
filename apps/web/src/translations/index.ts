import type { SupportedLocale } from "@/lib/locale";
import am from "./am/translation.json";
import en from "./en/translation.json";
import type {
  AdminMenusMessages,
  AdminRolesMessages,
  AdminUsersMessages,
  Translations,
} from "./types";

const translations: Record<SupportedLocale, Translations> = {
  en,
  am,
};

export type {
  AdminMenusMessages,
  AdminRolesMessages,
  AdminUsersMessages,
  Translations,
};
export { formatMessage } from "./format";

export function getTranslations(locale: SupportedLocale): Translations {
  return translations[locale];
}

export function getAdminRolesMessages(locale: SupportedLocale): AdminRolesMessages {
  return getTranslations(locale).adminRoles;
}

export function getAdminMenusMessages(locale: SupportedLocale): AdminMenusMessages {
  return getTranslations(locale).adminMenus;
}

export function getAdminUsersMessages(locale: SupportedLocale): AdminUsersMessages {
  return getTranslations(locale).adminUsers;
}
