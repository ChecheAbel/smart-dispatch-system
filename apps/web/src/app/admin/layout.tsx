import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Console | Smart Dispatch",
  description: "Smart Dispatch administrator dashboard.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
