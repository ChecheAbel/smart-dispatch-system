import type { Metadata } from "next";
import { DriversPage } from "./_components/drivers-page";

export const metadata: Metadata = {
  title: "Drivers | Admin Console",
  description: "Manage hired drivers, licenses, and assigned vehicles in Smart Dispatch.",
};

export default function Page() {
  return <DriversPage />;
}
