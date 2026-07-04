import type { Metadata } from "next";
import { EmailNotificationsPage } from "./_components/email-notifications-page";

export const metadata: Metadata = {
  title: "Email Notifications | Admin Console",
  description: "Configure email notification settings in the Smart Dispatch admin console.",
};

export default function Page() {
  return <EmailNotificationsPage />;
}
