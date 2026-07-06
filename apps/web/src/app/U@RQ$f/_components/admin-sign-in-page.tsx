"use client";

import AuthShell from "@/components/auth/AuthShell";
import { AuthBackToHomeLink } from "@/components/auth/AuthBackToHomeLink";
import AdminSignInForm from "@/components/auth/AdminSignInForm";

const ADMIN_SIGN_IN_SHELL = {
  mobileTitle: "Administrator Sign In",
  desktopEyebrow: "— Administrator Portal —",
  desktopTitle: (
    <>
      Smart Dispatch{" "}
      <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
        Control Center
      </span>
    </>
  ),
  desktopDescription:
    "Secure access for platform administrators to manage bookings, dispatch, fleet operations, and billing.",
} as const;

export function AdminSignInPage() {
  return (
    <AuthShell {...ADMIN_SIGN_IN_SHELL} leadingAction={<AuthBackToHomeLink />}>
      <AdminSignInForm />
    </AuthShell>
  );
}
