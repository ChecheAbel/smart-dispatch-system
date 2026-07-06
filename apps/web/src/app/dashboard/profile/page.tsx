import type { Metadata } from "next";
import { ProfilePage } from "@/app/admin/profile/_components/profile-page";

export const metadata: Metadata = {
  title: "Profile | Smart Dispatch",
  description: "Manage your Smart Dispatch customer profile.",
};

export default function CustomerProfilePage() {
  return <ProfilePage />;
}
