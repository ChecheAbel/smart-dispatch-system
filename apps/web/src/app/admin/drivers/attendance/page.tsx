import type { Metadata } from "next";
import { DriverAttendancePage } from "./_components/driver-attendance-page";

export const metadata: Metadata = {
  title: "Driver Attendance | Admin Console",
  description: "View daily driver check-in and check-out records submitted from the driver app.",
};

export default function Page() {
  return <DriverAttendancePage />;
}
