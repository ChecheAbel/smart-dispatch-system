import type {
  NotificationChannel,
  NotificationTemplate,
  NotificationTemplateRecipient,
} from "@smart-dispatch/types";

import type { ConfigurableNotificationModule } from "./notification-template-modules";

export const MODULE_EVENTS: Record<ConfigurableNotificationModule, string[]> = {
  ride_requests: [
    "created",
    "confirmed",
    "rejected",
    "assigned",
    "rerouted",
    "started",
    "completed",
    "cancelled",
    "reminder",
    "escalated",
    "escalated_supervisor",
  ],
  geofencing: ["violation"],
  user_registrations: ["submitted", "approved", "rejected"],
  insurance: ["due_soon", "expired"],
  inspection: ["due_soon", "expired"],
  invoices: ["generated", "due_soon", "overdue"],
  password_reset: ["email_requested", "sms_requested"],
};

export const CHANNEL_ORDER: NotificationChannel[] = ["email", "sms", "push"];

export const EVENT_GROUPS: Record<
  ConfigurableNotificationModule,
  { id: string; events: string[] }[]
> = {
  ride_requests: [
    { id: "booking", events: ["created", "cancelled"] },
    { id: "review", events: ["confirmed", "rejected"] },
    { id: "dispatch", events: ["assigned", "rerouted", "started", "completed"] },
    { id: "reminders", events: ["reminder"] },
    { id: "escalation", events: ["escalated", "escalated_supervisor"] },
  ],
  geofencing: [{ id: "alerts", events: ["violation"] }],
  user_registrations: [{ id: "registration", events: ["submitted", "approved", "rejected"] }],
  insurance: [{ id: "compliance", events: ["due_soon", "expired"] }],
  inspection: [{ id: "compliance", events: ["due_soon", "expired"] }],
  invoices: [{ id: "billing", events: ["generated", "due_soon", "overdue"] }],
  password_reset: [{ id: "recovery", events: ["email_requested", "sms_requested"] }],
};

const DRIVER_EVENTS = new Set(["assigned", "rerouted", "started", "completed"]);

export function shouldShowTemplate(
  module: ConfigurableNotificationModule,
  event: string,
  recipient: NotificationTemplateRecipient,
) {
  if (module === "user_registrations") {
    return recipient === "applicant";
  }

  if (module === "insurance" || module === "inspection") {
    return recipient === "fleet_manager";
  }

  if (module === "invoices") {
    return recipient === "requester";
  }

  if (module === "password_reset") {
    return recipient === "account_holder";
  }

  if (module === "geofencing") {
    return recipient === "driver";
  }

  if (event === "escalated") {
    return recipient === "dispatcher";
  }

  if (event === "escalated_supervisor") {
    return recipient === "supervisor";
  }

  if (recipient === "driver") {
    return DRIVER_EVENTS.has(event);
  }

  return recipient === "requester";
}

export function getVisibleEventTemplates(
  module: ConfigurableNotificationModule,
  event: string,
  templates: NotificationTemplate[],
) {
  return templates.filter(
    (template) =>
      template.module === module &&
      template.event === event &&
      shouldShowTemplate(module, event, template.recipient),
  );
}

export function getEventChannelStats(
  module: ConfigurableNotificationModule,
  event: string,
  templates: NotificationTemplate[],
  formState: Record<string, { is_enabled: boolean }>,
) {
  const visible = getVisibleEventTemplates(module, event, templates);
  const enabled = visible.filter(
    (template) => formState[template.id]?.is_enabled ?? template.is_enabled,
  ).length;

  return { enabled, total: visible.length };
}

export function getModuleChannelStats(
  module: ConfigurableNotificationModule,
  templates: NotificationTemplate[],
  formState: Record<string, { is_enabled: boolean }>,
) {
  let enabled = 0;
  let total = 0;

  for (const event of MODULE_EVENTS[module]) {
    const stats = getEventChannelStats(module, event, templates, formState);
    enabled += stats.enabled;
    total += stats.total;
  }

  return { enabled, total };
}
