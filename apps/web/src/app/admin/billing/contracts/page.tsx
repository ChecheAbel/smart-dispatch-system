import type { Metadata } from "next";
import { ContractsPage } from "./_components/contracts-page";

export const metadata: Metadata = {
  title: "Contracts | Admin Console",
  description: "Manage customer contracts in the Smart Dispatch admin console.",
};

export default function Page() {
  return <ContractsPage />;
}
