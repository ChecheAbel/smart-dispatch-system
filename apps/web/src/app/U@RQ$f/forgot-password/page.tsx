import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | Smart Dispatch",
  description: "Request a password reset link by email or SMS for your Smart Dispatch administrator account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm audience="admin" />;
}
