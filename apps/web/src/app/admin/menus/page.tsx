import type { Metadata } from "next";
import { MenusPage } from "./_components/menus-page";

export const metadata: Metadata = {
  title: "Menus | Admin Console",
  description: "Manage navigation menus in the Smart Dispatch admin console.",
};

export default function Page() {
  return <MenusPage />;
}
