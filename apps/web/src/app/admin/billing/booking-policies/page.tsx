import type { Metadata } from "next";
import { BookingPoliciesPage } from "./_components/booking-policies-page";

export const metadata: Metadata = {
  title: "Booking Policies | Admin Console",
  description: "Manage reusable booking policies in the Smart Dispatch admin console.",
};

export default function Page() {
  return <BookingPoliciesPage />;
}
