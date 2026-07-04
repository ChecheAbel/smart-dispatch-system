import type { Metadata } from "next";
import { ProfilePage } from "./_components/profile-page";

export const metadata: Metadata = {
  title: "Profile | Admin Console",
  description: "Manage your Smart Dispatch administrator profile.",
};

export default function Page() {
  return <ProfilePage />;
}
