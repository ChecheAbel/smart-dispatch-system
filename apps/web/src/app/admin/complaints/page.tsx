import type { Metadata } from "next";
import { ComplaintManagementPage } from "./_components/complaint-management-page";

export const metadata: Metadata = { title: "Complaint Management | Admin Console" };

export default function Page() {
  return <ComplaintManagementPage />;
}
