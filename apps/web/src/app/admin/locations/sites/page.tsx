import type { Metadata } from "next";
import { LocationsPage } from "./_components/locations-page";

export const metadata: Metadata = {
  title: "Locations | Admin Console",
  description: "Manage dispatch locations with GPS coordinates in the Smart Dispatch admin console.",
};

export default function Page() {
  return <LocationsPage />;
}
