import type { Metadata } from "next";
import { NotFoundPage } from "@/components/shared/not-found-page";

export const metadata: Metadata = {
  title: "Page not found | Smart Dispatch",
  description: "The page you are looking for could not be found.",
};

export default function NotFound() {
  return <NotFoundPage />;
}
