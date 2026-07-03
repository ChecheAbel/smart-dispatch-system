import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password | Smart Dispatch",
  description: "Set a new password using your Smart Dispatch administrator invitation link.",
};

function ResetPasswordFallback() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#f8f7f4]">
      <p className="text-sm text-slate-500">Loading…</p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
