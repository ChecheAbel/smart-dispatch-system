import type { Metadata } from "next";
import { CustomerShell } from "@/components/shared/layout";

export const metadata: Metadata = {
  title: "Dashboard | Smart Dispatch",
  description: "Customer dashboard for Smart Dispatch bookings and requests.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
