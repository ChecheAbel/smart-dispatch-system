import type { Metadata } from "next";
import { CustomerComplaintsPage } from "./_components/customer-complaints-page";

export const metadata: Metadata = { title: "Complaints | Smart Dispatch" };

export default function Page() {
  return <CustomerComplaintsPage />;
}
