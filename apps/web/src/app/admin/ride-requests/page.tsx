import type { Metadata } from "next";
import { AdminRideRequestsPage } from "./_components/admin-ride-requests-page";

export const metadata: Metadata = {
  title: "Ride Requests | Admin Console",
  description: "Review and approve customer ride requests in Smart Dispatch.",
};

export default function Page() {
  return <AdminRideRequestsPage />;
}
