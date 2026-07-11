import type { Metadata } from "next";
import { InvoicesPage } from "./_components/invoices-page";

export const metadata: Metadata = {
  title: "Invoices | Admin Console",
  description: "Manage contract invoices in the Smart Dispatch admin console.",
};

export default function Page() {
  return <InvoicesPage />;
}
