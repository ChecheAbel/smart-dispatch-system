import type { Metadata } from "next";
import { NotificationTemplatesPage } from "./_components/notification-templates-page";

export const metadata: Metadata = {
  title: "Message Templates | Admin Console",
  description: "Configure ride request email and SMS notification messages in the Smart Dispatch admin console.",
};

export default function Page() {
  return <NotificationTemplatesPage />;
}
