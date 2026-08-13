import type { Metadata } from "next";
import { FuelConsumptionManagementPage } from "./_components/fuel-consumption-management-page";

export const metadata: Metadata = {
  title: "Fuel Consumption Management | Admin Console",
  description:
    "Manage fuel refill and consumption records across the vehicle fleet.",
};

export default function Page() {
  return <FuelConsumptionManagementPage />;
}
