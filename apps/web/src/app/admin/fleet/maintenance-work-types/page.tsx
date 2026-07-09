import type { Metadata } from "next";
import { MaintenanceWorkTypesPage } from "./_components/maintenance-work-types-page";

export const metadata: Metadata = {
  title: "Maintenance Work Types | Admin Console",
  description: "Manage maintenance work type categories in the Smart Dispatch admin console.",
};

export default function Page() {
  return <MaintenanceWorkTypesPage />;
}
