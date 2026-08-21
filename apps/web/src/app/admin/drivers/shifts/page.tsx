import type { Metadata } from "next";
import { DriverShiftsPage } from "./_components/driver-shifts-page";

export const metadata: Metadata = {
  title: "Driver Shifts | Admin Console",
  description: "Assign hired drivers to morning, afternoon, and night shifts for each work date.",
};

export default function Page() {
  return <DriverShiftsPage />;
}
