"use client";

import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { AuthBackToHomeLink } from "@/components/auth/AuthBackToHomeLink";
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import UserSignInForm from "@/components/auth/UserSignInForm";
import { useLocale } from "@/components/shared/providers/locale-context";
import { getCustomerAuthMessages } from "@/translations";

export function UserSignInPage() {
  const { locale } = useLocale();
  const copy = getCustomerAuthMessages(locale);

  return (
    <AuthShell
      mobileTitle={copy.signIn.mobileTitle}
      desktopEyebrow={copy.signIn.desktopEyebrow}
      desktopTitle={
        <>
          {copy.signIn.desktopTitlePrefix}{" "}
          <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
            {copy.signIn.desktopTitleHighlight}
          </span>
        </>
      }
      desktopDescription={copy.signIn.desktopDescription}
      footerCopyright={copy.common.copyright}
      leadingAction={<AuthBackToHomeLink />}
      headerActions={<AuthLanguageSwitcher />}
    >
      <Suspense
        fallback={
          <div className="py-10 text-center text-slate-400">{copy.signIn.loadingForm}</div>
        }
      >
        <UserSignInForm />
      </Suspense>
    </AuthShell>
  );
}
