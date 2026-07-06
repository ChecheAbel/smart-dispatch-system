import type { Metadata } from "next";
import { AdminSignInPage } from "./_components/admin-sign-in-page";

export const metadata: Metadata = {
  title: "Administrator Sign In | Smart Dispatch",
  description: "Secure administrator sign in for the Smart Dispatch platform.",
};

export default function Page() {
  return <AdminSignInPage />;
}
