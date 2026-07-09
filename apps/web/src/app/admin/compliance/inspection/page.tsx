import type { Metadata } from "next";
import { Suspense } from "react";
import { ComplianceListPage } from "../_components/compliance-list-page";

export const metadata: Metadata = {
  title: "Inspection Compliance | Admin Console",
  description: "Fleet-wide roadworthiness inspection status.",
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ComplianceListPage type="inspection" />
    </Suspense>
  );
}
