import type { Metadata } from "next";
import { InvoiceDetailPage } from "./_components/invoice-detail-page";

export const metadata: Metadata = {
  title: "Invoice Details | Admin Console",
  description: "View contract invoice details in the Smart Dispatch admin console.",
};

export default function Page() {
  return <InvoiceDetailPage />;
}
