import type {
  NotificationModule,
  NotificationTemplate,
  NotificationTemplateRecipient,
} from "@smart-dispatch/types";

export const MODULE_EVENTS: Record<NotificationModule, string[]> = {
  ride_requests: [
    "created",
    "confirmed",
    "rejected",
    "assigned",
    "started",
    "completed",
    "cancelled",
  ],
  user_registrations: ["submitted", "approved", "rejected"],
  insurance: ["due_soon", "expired"],
  inspection: ["due_soon", "expired"],
};

export const EVENT_GROUPS: Record<
  NotificationModule,
  { id: string; events: string[] }[]
> = {
  ride_requests: [
    { id: "booking", events: ["created", "cancelled"] },
    { id: "review", events: ["confirmed", "rejected"] },
    { id: "dispatch", events: ["assigned", "started", "completed"] },
  ],
  user_registrations: [{ id: "registration", events: ["submitted", "approved", "rejected"] }],
  insurance: [{ id: "compliance", events: ["due_soon", "expired"] }],
  inspection: [{ id: "compliance", events: ["due_soon", "expired"] }],
};

const DRIVER_EVENTS = new Set(["assigned", "started", "completed"]);

export function shouldShowTemplate(
  module: NotificationModule,
  event: string,
  recipient: NotificationTemplateRecipient,
) {
  if (module === "user_registrations") {
    return recipient === "applicant";
  }

  if (module === "insurance" || module === "inspection") {
    return recipient === "fleet_manager";
  }

  if (recipient === "driver") {
    return DRIVER_EVENTS.has(event);
  }

  return recipient === "requester";
}

export function getVisibleEventTemplates(
  module: NotificationModule,
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
  module: NotificationModule,
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
  module: NotificationModule,
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
