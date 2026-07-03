import type { Metadata } from "next";
import { DashboardShell } from "@/components/shared/layout";

export const metadata: Metadata = {
  title: "Admin Console | Smart Dispatch",
  description: "Smart Dispatch administrator dashboard.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
