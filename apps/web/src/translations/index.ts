import type { SupportedLocale } from "@/lib/locale";
import am from "./am/translation.json";
import en from "./en/translation.json";
import type {
  AdminAuditLogsMessages,
  AdminMenusMessages,
  AdminNotificationsEmailMessages,
  AdminNotificationsSmsMessages,
  AdminRolesMessages,
  AdminUsersMessages,
  Translations,
} from "./types";

const translations: Record<SupportedLocale, Translations> = {
  en,
  am,
};

export type {
  AdminAuditLogsMessages,
  AdminMenusMessages,
  AdminNotificationsEmailMessages,
  AdminNotificationsSmsMessages,
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

export function getAdminAuditLogsMessages(locale: SupportedLocale): AdminAuditLogsMessages {
  return getTranslations(locale).adminAuditLogs;
}

export function getAdminMenusMessages(locale: SupportedLocale): AdminMenusMessages {
  return getTranslations(locale).adminMenus;
}

export function getAdminUsersMessages(locale: SupportedLocale): AdminUsersMessages {
  return getTranslations(locale).adminUsers;
}

export function getAdminNotificationsEmailMessages(
  locale: SupportedLocale,
): AdminNotificationsEmailMessages {
  return getTranslations(locale).adminNotificationsEmail;
}

export function getAdminNotificationsSmsMessages(
  locale: SupportedLocale,
): AdminNotificationsSmsMessages {
  return getTranslations(locale).adminNotificationsSms;
}
