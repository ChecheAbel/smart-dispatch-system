import type { Metadata } from "next";
import { DispatchOverviewPage } from "./_components/dispatch-overview-page";

export const metadata: Metadata = {
  title: "Dispatch Overview | Admin Console",
  description: "Assignment queue, live trips, fleet availability, and open complaints.",
};

export default function Page() {
  return <DispatchOverviewPage />;
}
