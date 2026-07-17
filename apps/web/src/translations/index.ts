import type { SupportedLocale } from "@/lib/locale";
import am from "./am/translation.json";
import en from "./en/translation.json";
import type {
  AdminAuditLogsMessages,
  AdminMenusMessages,
  AdminNotificationsMessages,
  AdminNotificationsEmailMessages,
  AdminNotificationsRideRequestsMessages,
  AdminNotificationTemplatesMessages,
  AdminNotificationDeliveryLogsMessages,
  AdminNotificationsSmsMessages,
  AdminRolesMessages,
  AdminUsersMessages,
  AdminUserRegistrationsMessages,
  AdminRideRequestsMessages,
  AdminVehicleTypesMessages,
  AdminMaintenanceWorkTypesMessages,
  AdminComplianceMessages,
  AdminVehicleClassesMessages,
  AdminVehiclesMessages,
  AdminRegionsMessages,
  AdminLocationsMessages,
  AdminFarePlansMessages,
  AdminContractsMessages,
  AdminInvoicesMessages,
  AdminShellMessages,
  CustomerShellMessages,
  AdminDashboardMessages,
  CustomerDashboardMessages,
  CustomerRequestsMessages,
  CustomerRequestHistoryMessages,
  CustomerContractsMessages,
  CustomerInvoicesMessages,
  AdminProfileMessages,
  AdminDeadlineSettingsMessages,
  AdminAuthMessages,
  Translations,
} from "./types";

const translations: Record<SupportedLocale, Translations> = {
  en,
  am,
};

export type {
  AdminAuditLogsMessages,
  AdminMenusMessages,
  AdminNotificationsMessages,
  AdminNotificationsEmailMessages,
  AdminNotificationsRideRequestsMessages,
  AdminNotificationTemplatesMessages,
  AdminNotificationDeliveryLogsMessages,
  AdminNotificationsSmsMessages,
  AdminRolesMessages,
  AdminUsersMessages,
  AdminUserRegistrationsMessages,
  AdminRideRequestsMessages,
  AdminVehicleTypesMessages,
  AdminMaintenanceWorkTypesMessages,
  AdminComplianceMessages,
  AdminVehicleClassesMessages,
  AdminVehiclesMessages,
  AdminRegionsMessages,
  AdminLocationsMessages,
  AdminFarePlansMessages,
  AdminContractsMessages,
  AdminInvoicesMessages,
  AdminShellMessages,
  CustomerShellMessages,
  AdminDashboardMessages,
  CustomerDashboardMessages,
  CustomerRequestsMessages,
  CustomerRequestHistoryMessages,
  CustomerContractsMessages,
  CustomerInvoicesMessages,
  AdminProfileMessages,
  AdminDeadlineSettingsMessages,
  AdminAuthMessages,
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

export function getAdminUserRegistrationsMessages(
  locale: SupportedLocale,
): AdminUserRegistrationsMessages {
  return getTranslations(locale).adminUserRegistrations;
}

export function getAdminRideRequestsMessages(
  locale: SupportedLocale,
): AdminRideRequestsMessages {
  return getTranslations(locale).adminRideRequests;
}

export function getAdminNotificationsMessages(
  locale: SupportedLocale,
): AdminNotificationsMessages {
  return getTranslations(locale).adminNotifications;
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

export function getAdminNotificationsRideRequestsMessages(
  locale: SupportedLocale,
): AdminNotificationsRideRequestsMessages {
  return getTranslations(locale).adminNotificationTemplates;
}

export function getAdminNotificationTemplatesMessages(
  locale: SupportedLocale,
): AdminNotificationTemplatesMessages {
  return getTranslations(locale).adminNotificationTemplates;
}

export function getAdminNotificationDeliveryLogsMessages(
  locale: SupportedLocale,
): AdminNotificationDeliveryLogsMessages {
  return getTranslations(locale).adminNotificationDeliveryLogs;
}

export function getAdminVehicleTypesMessages(
  locale: SupportedLocale,
): AdminVehicleTypesMessages {
  return getTranslations(locale).adminVehicleTypes;
}

export function getAdminMaintenanceWorkTypesMessages(
  locale: SupportedLocale,
): AdminMaintenanceWorkTypesMessages {
  return getTranslations(locale).adminMaintenanceWorkTypes;
}

export function getAdminComplianceMessages(locale: SupportedLocale): AdminComplianceMessages {
  return getTranslations(locale).adminCompliance;
}

export function getAdminVehicleClassesMessages(
  locale: SupportedLocale,
): AdminVehicleClassesMessages {
  return getTranslations(locale).adminVehicleClasses;
}

export function getAdminVehiclesMessages(locale: SupportedLocale): AdminVehiclesMessages {
  return getTranslations(locale).adminVehicles;
}

export function getAdminRegionsMessages(locale: SupportedLocale): AdminRegionsMessages {
  return getTranslations(locale).adminRegions;
}

export function getAdminLocationsMessages(locale: SupportedLocale): AdminLocationsMessages {
  return getTranslations(locale).adminLocations;
}

export function getAdminFarePlansMessages(locale: SupportedLocale): AdminFarePlansMessages {
  return getTranslations(locale).adminFarePlans;
}

export function getAdminContractsMessages(locale: SupportedLocale): AdminContractsMessages {
  return getTranslations(locale).adminContracts;
}

export function getAdminInvoicesMessages(locale: SupportedLocale): AdminInvoicesMessages {
  return getTranslations(locale).adminInvoices;
}

export function getAdminShellMessages(locale: SupportedLocale): AdminShellMessages {
  return getTranslations(locale).adminShell;
}

export function getCustomerShellMessages(locale: SupportedLocale): CustomerShellMessages {
  return getTranslations(locale).customerShell;
}

export function getAdminDashboardMessages(locale: SupportedLocale): AdminDashboardMessages {
  return getTranslations(locale).adminDashboard;
}

export function getCustomerDashboardMessages(locale: SupportedLocale): CustomerDashboardMessages {
  return getTranslations(locale).customerDashboard;
}

export function getCustomerRequestsMessages(locale: SupportedLocale): CustomerRequestsMessages {
  return getTranslations(locale).customerRequests;
}

export function getCustomerRequestHistoryMessages(
  locale: SupportedLocale,
): CustomerRequestHistoryMessages {
  return getTranslations(locale).customerRequestHistory;
}

export function getCustomerContractsMessages(locale: SupportedLocale): CustomerContractsMessages {
  return getTranslations(locale).customerContracts;
}

export function getCustomerInvoicesMessages(locale: SupportedLocale): CustomerInvoicesMessages {
  return getTranslations(locale).customerInvoices;
}

export function getAdminProfileMessages(locale: SupportedLocale): AdminProfileMessages {
  return getTranslations(locale).adminProfile;
}

export function getAdminDeadlineSettingsMessages(
  locale: SupportedLocale,
): AdminDeadlineSettingsMessages {
  return getTranslations(locale).adminDeadlineSettings;
}

export function getAdminAuthMessages(locale: SupportedLocale): AdminAuthMessages {
  return getTranslations(locale).adminAuth;
}
