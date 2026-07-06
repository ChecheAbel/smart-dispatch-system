import type { Metadata } from "next";
import { UserRegistrationsPage } from "./_components/user-registrations-page";

export const metadata: Metadata = {
  title: "Customer Registrations | Admin Console",
  description: "Review and approve customer registration applications in Smart Dispatch.",
};

export default function Page() {
  return <UserRegistrationsPage />;
}
