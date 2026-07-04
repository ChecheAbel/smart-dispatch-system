import type { Metadata } from "next";
import { VehicleTypesPage } from "./_components/vehicle-types-page";

export const metadata: Metadata = {
  title: "Vehicle Types | Admin Console",
  description: "Manage vehicle type categories in the Smart Dispatch admin console.",
};

export default function Page() {
  return <VehicleTypesPage />;
}
