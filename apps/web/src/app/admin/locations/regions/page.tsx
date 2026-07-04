import type { Metadata } from "next";
import { RegionsPage } from "./_components/regions-page";

export const metadata: Metadata = {
  title: "Regions | Admin Console",
  description: "Manage administrative regions in the Smart Dispatch admin console.",
};

export default function Page() {
  return <RegionsPage />;
}
