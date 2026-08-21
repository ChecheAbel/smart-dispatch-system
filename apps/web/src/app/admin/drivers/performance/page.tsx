import type { Metadata } from "next";
import { DriverPerformancePage } from "./_components/driver-performance-page";

export const metadata: Metadata = {
  title: "Driver Performance | Admin Console",
  description: "Review trip completion, punctuality, complaints, and attendance for hired drivers.",
};

export default function Page() {
  return <DriverPerformancePage />;
}
