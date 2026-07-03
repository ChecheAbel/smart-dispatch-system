import type { Metadata } from "next";
import AdminSignInForm from "@/components/auth/AdminSignInForm";

export const metadata: Metadata = {
  title: "Administrator Sign In | Smart Dispatch",
  description: "Secure administrator sign in for the Smart Dispatch platform.",
};

export default function AdminSignInPage() {
  return <AdminSignInForm />;
}
