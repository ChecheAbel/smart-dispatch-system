import { ensureNotificationConfigurations } from "../models/notification.model";
import { ensureNotificationTemplates } from "../models/notification-template.model";

export async function seedNotifications() {
  await ensureNotificationConfigurations();
  await ensureNotificationTemplates();
  console.log("[Seed] Notification configurations ready");
}
