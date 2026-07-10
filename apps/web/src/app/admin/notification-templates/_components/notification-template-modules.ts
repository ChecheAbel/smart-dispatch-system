import type { LucideIcon } from "lucide-react";
import {
  CarFront,
  ClipboardList,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { NotificationModule } from "@smart-dispatch/types";

export type NotificationModuleCategory = "operations" | "accounts" | "compliance";

export type NotificationModuleCopyKey =
  | "rideRequests"
  | "userRegistrations"
  | "insurance"
  | "inspection";

export type NotificationModuleDefinition = {
  id: NotificationModule;
  category: NotificationModuleCategory;
  copyKey: NotificationModuleCopyKey;
  icon: LucideIcon;
};

/** Single registry for notification template areas. Add new modules here only. */
export const NOTIFICATION_MODULE_DEFINITIONS: NotificationModuleDefinition[] = [
  {
    id: "ride_requests",
    category: "operations",
    copyKey: "rideRequests",
    icon: CarFront,
  },
  {
    id: "user_registrations",
    category: "accounts",
    copyKey: "userRegistrations",
    icon: UserRoundCheck,
  },
  {
    id: "insurance",
    category: "compliance",
    copyKey: "insurance",
    icon: ShieldCheck,
  },
  {
    id: "inspection",
    category: "compliance",
    copyKey: "inspection",
    icon: ClipboardList,
  },
];

export const NOTIFICATION_MODULE_ORDER = NOTIFICATION_MODULE_DEFINITIONS.map(
  (definition) => definition.id,
);

export const NOTIFICATION_MODULE_CATEGORIES: NotificationModuleCategory[] = [
  "operations",
  "accounts",
  "compliance",
];

export function parseNotificationModule(value: string | null): NotificationModule {
  const match = NOTIFICATION_MODULE_DEFINITIONS.find((definition) => definition.id === value);
  return match?.id ?? NOTIFICATION_MODULE_DEFINITIONS[0].id;
}

export function getModuleDefinition(module: NotificationModule): NotificationModuleDefinition {
  const definition = NOTIFICATION_MODULE_DEFINITIONS.find((item) => item.id === module);
  if (!definition) {
    throw new Error(`Unknown notification module: ${module}`);
  }

  return definition;
}

export function groupModulesByCategory(
  modules: NotificationModuleDefinition[] = NOTIFICATION_MODULE_DEFINITIONS,
) {
  return NOTIFICATION_MODULE_CATEGORIES.map((category) => ({
    category,
    modules: modules.filter((definition) => definition.category === category),
  })).filter((group) => group.modules.length > 0);
}
