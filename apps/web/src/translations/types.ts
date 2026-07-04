import type en from "./en/translation.json";

export type Translations = typeof en;

export type AdminRolesMessages = Translations["adminRoles"];
export type AdminMenusMessages = Translations["adminMenus"];
export type AdminUsersMessages = Translations["adminUsers"];
export type AdminNotificationsEmailMessages = Translations["adminNotificationsEmail"];
export type AdminNotificationsSmsMessages = Translations["adminNotificationsSms"];
