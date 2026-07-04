import type { Metadata } from "next";
import { AuditLogsPage } from "./_components/audit-logs-page";

export const metadata: Metadata = {
  title: "Audit Logs | Admin Console",
  description: "Review platform activity and audit trail in the Smart Dispatch admin console.",
};

export default function Page() {
  return <AuditLogsPage />;
}
