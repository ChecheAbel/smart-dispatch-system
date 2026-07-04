import type { Metadata } from "next";
import { SmsNotificationsPage } from "./_components/sms-notifications-page";

export const metadata: Metadata = {
  title: "SMS Notifications | Admin Console",
  description: "Configure SMS notification settings in the Smart Dispatch admin console.",
};

export default function Page() {
  return <SmsNotificationsPage />;
}
