import type { NotificationTemplate } from "@smart-dispatch/types";
import type { NotificationTemplate as DbNotificationTemplate } from "../generated/prisma";

export function toPublicNotificationTemplate(
  template: DbNotificationTemplate,
): NotificationTemplate {
  return {
    id: template.id,
    module: template.module,
    event: template.event,
    channel: template.channel,
    recipient: template.recipient,
    is_enabled: template.isEnabled,
    subject: template.subject,
    body: template.body,
    created_at: template.createdAt.toISOString(),
    updated_at: template.updatedAt.toISOString(),
  };
}
