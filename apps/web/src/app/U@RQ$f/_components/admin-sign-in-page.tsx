"use client";

import AuthShell from "@/components/auth/AuthShell";
import { AuthBackToHomeLink } from "@/components/auth/AuthBackToHomeLink";
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import AdminSignInForm from "@/components/auth/AdminSignInForm";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useLocale } from "@/components/shared/providers/locale-context";
import { getAdminAuthMessages } from "@/translations";

export function AdminSignInPage() {
  const { locale } = useLocale();
  const copy = getAdminAuthMessages(locale).signIn;

  return (
    <AuthShell
      mobileTitle={copy.mobileTitle}
      desktopEyebrow={copy.desktopEyebrow}
      desktopTitle={
        <>
          {copy.desktopTitlePrefix}{" "}
          <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
            {copy.desktopTitleHighlight}
          </span>
        </>
      }
      desktopDescription={copy.desktopDescription}
      footerCopyright={getAdminAuthMessages(locale).common.copyright}
      leadingAction={<AuthBackToHomeLink />}
      headerActions={
        <div className="auth-theme-toggle-inline flex items-center gap-2">
          <ThemeToggle
            placement="inline"
            className="!rounded-xl !border !border-slate-200 !bg-white dark:!border-[#35403f] dark:!bg-[#1b2224] dark:hover:!border-[var(--brand-accent)]/40 dark:hover:!bg-[#252d2c]"
          />
          <AuthLanguageSwitcher className="dark:!border-[#35403f] dark:!bg-[#1b2224] dark:hover:!border-[var(--brand-accent)]/40 dark:hover:!bg-[#252d2c]" />
        </div>
      }
    >
      <AdminSignInForm />
    </AuthShell>
  );
}
