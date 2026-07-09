import type { Metadata } from "next";
import { Suspense } from "react";
import { ComplianceListPage } from "../_components/compliance-list-page";

export const metadata: Metadata = {
  title: "Insurance Compliance | Admin Console",
  description: "Fleet-wide insurance policy status and renewals.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComplianceListPage type="insurance" />
    </Suspense>
  );
}
