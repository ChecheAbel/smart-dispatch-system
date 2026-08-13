import type { Metadata } from "next";
import { MaintenanceManagementPage } from "./_components/maintenance-management-page";

export const metadata: Metadata = {
  title: "Maintenance Management | Admin Console",
  description: "Manage maintenance records across the vehicle fleet.",
};

export default function Page() {
  return <MaintenanceManagementPage />;
}
