"use client";

import AuthShell from "@/components/auth/AuthShell";
import { AuthBackToHomeLink } from "@/components/auth/AuthBackToHomeLink";
import UserSignInForm from "@/components/auth/UserSignInForm";

const USER_SIGN_IN_SHELL = {
  mobileTitle: "Customer Sign In",
  desktopEyebrow: "— Customer Portal —",
  desktopTitle: (
    <>
      Book with{" "}
      <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
        Smart Dispatch
      </span>
    </>
  ),
  desktopDescription:
    "Sign in to request vehicles, track bookings, and manage your organization profile.",
} as const;

export function UserSignInPage() {
  return (
    <AuthShell {...USER_SIGN_IN_SHELL} leadingAction={<AuthBackToHomeLink />}>
      <UserSignInForm />
    </AuthShell>
  );
}
