import type { Metadata } from "next";
import { UserSignInPage } from "./_components/user-sign-in-page";

export const metadata: Metadata = {
  title: "Sign In | Smart Dispatch",
  description: "Sign in to your Smart Dispatch customer account to book and manage vehicle requests.",
};

export default function SignInPage() {
  return <UserSignInPage />;
}
