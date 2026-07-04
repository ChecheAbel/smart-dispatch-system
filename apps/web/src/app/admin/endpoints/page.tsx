import type { Metadata } from "next";
import { EndpointsPage } from "./_components/endpoints-page";

export const metadata: Metadata = {
  title: "Endpoints | Admin Console",
  description: "Manage API endpoints in the Smart Dispatch admin console.",
};

export default function Page() {
  return <EndpointsPage />;
}
