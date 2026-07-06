import type { Metadata } from "next";
import UserRegisterForm from "@/components/auth/UserRegisterForm";

export const metadata: Metadata = {
  title: "User Registration | Smart Dispatch",
  description: "Create your Smart Dispatch account.",
};

export default function UserRegisterPage() {
  return <UserRegisterForm />;
}
