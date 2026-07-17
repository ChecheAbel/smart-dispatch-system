"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import type { AuthAudience } from "@/components/auth/ForgotPasswordForm";
import { useLocale } from "@/components/shared/providers/locale-context";
import { resetPassword } from "@/lib/auth-api";
import {
  ADMIN_FORGOT_PASSWORD_PATH,
  ADMIN_SIGN_IN_PATH,
  USER_FORGOT_PASSWORD_PATH,
  USER_SIGN_IN_PATH,
} from "@/lib/auth-paths";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getAdminAuthMessages, getCustomerAuthMessages } from "@/translations";

type ResetPasswordFormProps = {
  audience?: AuthAudience;
};

export default function ResetPasswordForm({ audience = "admin" }: ResetPasswordFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const authCopy =
    audience === "customer" ? getCustomerAuthMessages(locale) : getAdminAuthMessages(locale);
  const copy = authCopy.resetPassword;
  const forgotCopy = authCopy.forgotPassword;
  const common = authCopy.common;
  const token = searchParams.get("token") ?? "";
  const signInPath = audience === "customer" ? USER_SIGN_IN_PATH : ADMIN_SIGN_IN_PATH;
  const forgotPasswordPath =
    audience === "customer" ? USER_FORGOT_PASSWORD_PATH : ADMIN_FORGOT_PASSWORD_PATH;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      showErrorToast({
        title: forgotCopy.errors.passwordTooShortTitle,
        description: forgotCopy.errors.passwordTooShortDescription,
      });
      return;
    }

    if (password !== confirmPassword) {
      showErrorToast({
        title: forgotCopy.errors.passwordMismatchTitle,
        description: forgotCopy.errors.passwordMismatchDescription,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ channel: "email", token, password });
      setSuccess(true);
      showSuccessToast({
        title: copy.passwordUpdated,
        description: copy.redirecting,
      });
      setTimeout(() => router.push(signInPath), 2500);
    } catch (err) {
      showErrorToast({
        title: forgotCopy.errors.resetFailedTitle,
        description: err instanceof Error ? err.message : common.tryAgain,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        mobileTitle={copy.invalidLinkTitle}
        desktopEyebrow={copy.desktopEyebrow}
        desktopTitle={copy.invalidInvitationTitle}
        desktopDescription={copy.invalidLinkDescription}
        footerCopyright={common.copyright}
        headerActions={<AuthLanguageSwitcher />}
      >
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center space-y-4">
          <p className="text-sm text-slate-500 leading-relaxed">{copy.requestNewInvitation}</p>
          <Link
            href={forgotPasswordPath}
            className="inline-flex text-sm font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors"
          >
            {copy.requestNewInvitationCta}
          </Link>
        </div>
      </AuthShell>
    );
  }

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
      footerCopyright={common.copyright}
      headerActions={<AuthLanguageSwitcher />}
    >
      <div className="hidden lg:block mb-8">
        <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">
          {copy.formEyebrow}
        </p>
        <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">{copy.formTitle}</h2>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">{copy.formDescription}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
        {success ? (
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-[#1C3A34]">{copy.passwordUpdated}</h3>
            <p className="text-sm text-slate-500">{copy.redirecting}</p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="new-password"
                className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
              >
                {forgotCopy.newPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                  placeholder={forgotCopy.passwordPlaceholder}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#1C3A34] transition-colors"
                  aria-label={showPassword ? common.hidePassword : common.showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
              >
                {forgotCopy.confirmPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                  placeholder={forgotCopy.confirmPasswordPlaceholder}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#1C3A34] transition-colors"
                  aria-label={showConfirmPassword ? common.hidePassword : common.showPassword}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1C3A34] hover:bg-[#162e29] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-[15px] py-4 rounded-xl border-b-[3px] border-[#C9B87A] tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#1C3A34]/10 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {forgotCopy.updatingPassword}
                </>
              ) : (
                forgotCopy.resetPassword
              )}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href={signInPath} className="font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors">
          ← {common.backToSignIn}
        </Link>
      </p>
    </AuthShell>
  );
}
