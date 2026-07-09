import type { Metadata } from "next";
import { ComplianceOverviewPage } from "./_components/compliance-overview-page";

export const metadata: Metadata = {
  title: "Compliance Overview | Admin Console",
  description: "Fleet-wide insurance and inspection compliance overview.",
};

export default function Page() {
  return <ComplianceOverviewPage />;
}
