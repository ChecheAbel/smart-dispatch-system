import type { Metadata } from "next";
import { FarePlansPage } from "./_components/fare-plans-page";

export const metadata: Metadata = {
  title: "Fare Plans | Admin Console",
  description: "Manage fare plans and pricing rules in the Smart Dispatch admin console.",
};

export default function Page() {
  return <FarePlansPage />;
}
