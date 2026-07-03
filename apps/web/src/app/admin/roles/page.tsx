import type { Metadata } from "next";
import { RolesPage } from "./_components/roles-page";

export const metadata: Metadata = {
  title: "Roles | Admin Console",
  description: "Manage platform roles in the Smart Dispatch admin console.",
};

export default function Page() {
  return <RolesPage />;
}
