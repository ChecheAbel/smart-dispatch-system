import type { Metadata } from "next";
import { DriverApplicationsPage } from "./_components/driver-applications-page";

export const metadata: Metadata = {
  title: "Driver Applications | Admin Console",
  description: "Review and approve pending driver registrations in the Smart Dispatch admin console.",
};

export default function Page() {
  return <DriverApplicationsPage />;
}
