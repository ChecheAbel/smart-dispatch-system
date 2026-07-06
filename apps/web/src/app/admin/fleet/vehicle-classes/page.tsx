import type { Metadata } from "next";
import { VehicleClassesPage } from "./_components/vehicle-classes-page";

export const metadata: Metadata = {
  title: "Vehicle Classes | Admin Console",
  description: "Manage vehicle service classes in the Smart Dispatch admin console.",
};

export default function Page() {
  return <VehicleClassesPage />;
}
