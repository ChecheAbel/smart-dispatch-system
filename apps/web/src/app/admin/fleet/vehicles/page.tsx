import type { Metadata } from "next";
import { VehiclesPage } from "./_components/vehicles-page";

export const metadata: Metadata = {
  title: "Vehicles | Admin Console",
  description: "Manage fleet vehicles in the Smart Dispatch admin console.",
};

export default function Page() {
  return <VehiclesPage />;
}
