import type { Metadata } from "next";
import { Suspense } from "react";
import { NotificationsPage } from "./_components/notifications-page";

export const metadata: Metadata = {
  title: "Notifications | Admin Console",
  description: "Configure email and SMS notification settings in the Smart Dispatch admin console.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <NotificationsPage />
    </Suspense>
  );
}
