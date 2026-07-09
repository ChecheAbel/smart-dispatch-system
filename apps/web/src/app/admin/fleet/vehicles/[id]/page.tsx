import type { Metadata } from "next";
import { VehicleDetailPage } from "./_components/vehicle-detail-page";

export const metadata: Metadata = {
  title: "Vehicle details | Admin Console",
  description: "Vehicle overview, maintenance logs, and history.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VehicleDetailPage vehicleId={id} />;
}
