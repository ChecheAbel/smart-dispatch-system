import type { Metadata } from "next";
import { NotificationDeliveryLogsPage } from "./_components/notification-delivery-logs-page";

export const metadata: Metadata = {
  title: "Notification Delivery Log | Smart Dispatch",
  description: "Review sent, skipped, and failed notification deliveries.",
};

export default function Page() {
  return <NotificationDeliveryLogsPage />;
}
