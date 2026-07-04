import type { Metadata } from "next";
import { PermissionsPage } from "./_components/permissions-page";

export const metadata: Metadata = {
  title: "Permissions | Admin Console",
  description: "Manage platform permissions in the Smart Dispatch admin console.",
};

export default function Page() {
  return <PermissionsPage />;
}
