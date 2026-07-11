import type { Metadata } from "next";
import { ContractDetailPage } from "./_components/contract-detail-page";

export const metadata: Metadata = {
  title: "Contract Details | Admin Console",
  description: "View customer contract details in the Smart Dispatch admin console.",
};

export default function Page() {
  return <ContractDetailPage />;
}
