import { ensureNotificationConfigurations } from "../models/notification.model";

export async function seedNotifications() {
  await ensureNotificationConfigurations();
  console.log("[Seed] Notification configurations ready");
}
