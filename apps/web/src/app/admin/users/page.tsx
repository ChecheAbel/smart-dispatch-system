import type { Metadata } from "next";
import { UsersPage } from "@/app/admin/users/_components/users-page";

export const metadata: Metadata = {
  title: "Users | Admin Console",
  description: "Manage platform users in the Smart Dispatch admin console.",
};

export default function Page() {
  return <UsersPage />;
}
