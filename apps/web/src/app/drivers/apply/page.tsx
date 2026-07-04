import type { Metadata } from "next";
import DriverApplyForm from "@/components/auth/DriverApplyForm";

export const metadata: Metadata = {
  title: "Driver Registration | Smart Dispatch",
  description: "Apply to join the Smart Dispatch driver network.",
};

export default function DriverApplyPage() {
  return <DriverApplyForm />;
}
