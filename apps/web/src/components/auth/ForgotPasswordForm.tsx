"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Eye, EyeOff, Loader2, Lock, Mail, Phone, RotateCcw } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { AuthLanguageSwitcher } from "@/components/auth/AuthLanguageSwitcher";
import { formatCountdown, OtpCodeInput } from "@/components/auth/OtpCodeInput";
import { useLocale } from "@/components/shared/providers/locale-context";
import { requestPasswordReset, resetPassword, verifyPasswordResetOtp } from "@/lib/auth-api";
import {
  ADMIN_SIGN_IN_PATH,
  USER_SIGN_IN_PATH,
} from "@/lib/auth-paths";
import {
  ETHIOPIA_MOBILE_COUNTRY_CODE,
  formatEthiopianMobileNumber,
  isValidEthiopianMobileLocal,
  sanitizeEthiopianMobileInput,
} from "@/lib/ethiopian-mobile";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  formatMessage,
  getAdminAuthMessages,
  getCustomerAuthMessages,
} from "@/translations";
import { cn } from "@/lib/utils";

type ResetMethod = "email" | "mobile";
type MobileStep = "request" | "verify_otp" | "set_password";
export type AuthAudience = "admin" | "customer";

const OTP_EXPIRY_SECONDS = 10 * 60;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

type ForgotPasswordFormProps = {
  audience?: AuthAudience;
};

export default function ForgotPasswordForm({ audience = "admin" }: ForgotPasswordFormProps) {
  const router = useRouter();
  const { locale } = useLocale();
  const authCopy =
    audience === "customer" ? getCustomerAuthMessages(locale) : getAdminAuthMessages(locale);
  const copy = authCopy.forgotPassword;
  const common = authCopy.common;
  const signInPath = audience === "customer" ? USER_SIGN_IN_PATH : ADMIN_SIGN_IN_PATH;
  const [resetMethod, setResetMethod] = useState<ResetMethod>("email");
  const [mobileStep, setMobileStep] = useState<MobileStep>("request");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [mobileNumberFormatted, setMobileNumberFormatted] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendCooldownIn, setResendCooldownIn] = useState(0);
  const [otpTimerEpoch, setOtpTimerEpoch] = useState(0);

  const isEmailReset = resetMethod === "email";

  function startOtpTimers() {
    setOtpExpiresIn(OTP_EXPIRY_SECONDS);
    setResendCooldownIn(OTP_RESEND_COOLDOWN_SECONDS);
    setOtpTimerEpoch((value) => value + 1);
  }

  useEffect(() => {
    if (mobileStep !== "verify_otp") return;

    const timer = window.setInterval(() => {
      setOtpExpiresIn((seconds) => Math.max(0, seconds - 1));
      setResendCooldownIn((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [mobileStep, otpTimerEpoch]);

  function selectResetMethod(method: ResetMethod) {
    if (method === resetMethod) return;
    setResetMethod(method);
    setEmail("");
    setMobile("");
    setMobileStep("request");
    setOtp("");
    setResetToken("");
    setPassword("");
    setConfirmPassword("");
    setEmailSent(false);
    setOtpExpiresIn(0);
    setResendCooldownIn(0);
  }

  async function sendMobileOtp() {
    await requestPasswordReset({
      channel: "mobile",
      mobile_number: mobileNumberFormatted,
    });
  }

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isEmailReset && !isValidEthiopianMobileLocal(mobile)) {
      showErrorToast({
        title: copy.errors.invalidMobileTitle,
        description: copy.errors.invalidMobileDescription,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEmailReset) {
        await requestPasswordReset({ channel: "email", email });
        setEmailSent(true);
        showSuccessToast({
          title: copy.emailSentTitle,
          description: formatMessage(copy.emailSentDescription, { email }),
        });
      } else {
        const formatted = formatEthiopianMobileNumber(mobile);
        setMobileNumberFormatted(formatted);
        await requestPasswordReset({ channel: "mobile", mobile_number: formatted });
        setMobileStep("verify_otp");
        startOtpTimers();
        showSuccessToast({
          title: copy.sendVerificationCode,
          description: formatMessage(copy.enterCodeSentTo, {
            mobile: `${ETHIOPIA_MOBILE_COUNTRY_CODE} ${mobile}`,
          }),
        });
      }
    } catch (err) {
      showErrorToast({
        title: isEmailReset ? copy.errors.sendLinkFailedTitle : copy.errors.sendCodeFailedTitle,
        description: err instanceof Error ? err.message : common.tryAgain,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      showErrorToast({
        title: copy.errors.incompleteCodeTitle,
        description: copy.errors.incompleteCodeDescription,
      });
      return;
    }

    if (otpExpiresIn <= 0) {
      showErrorToast({
        title: copy.errors.codeExpiredTitle,
        description: copy.errors.codeExpiredDescription,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await verifyPasswordResetOtp(mobileNumberFormatted, otp);
      setResetToken(result.reset_token);
      setMobileStep("set_password");
    } catch (err) {
      showErrorToast({
        title: copy.errors.verifyFailedTitle,
        description: err instanceof Error ? err.message : copy.errors.verifyFailedDescription,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      showErrorToast({
        title: copy.errors.passwordTooShortTitle,
        description: copy.errors.passwordTooShortDescription,
      });
      return;
    }

    if (password !== confirmPassword) {
      showErrorToast({
        title: copy.errors.passwordMismatchTitle,
        description: copy.errors.passwordMismatchDescription,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await resetPassword({ channel: "email", token: resetToken, password });
      showSuccessToast({
        title: copy.resetPassword,
        description: common.backToSignIn,
      });
      router.push(signInPath);
    } catch (err) {
      showErrorToast({
        title: copy.errors.resetFailedTitle,
        description: err instanceof Error ? err.message : common.tryAgain,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldownIn > 0 || isResending) return;

    setIsResending(true);

    try {
      await sendMobileOtp();
      setOtp("");
      setResetToken("");
      setPassword("");
      setConfirmPassword("");
      setMobileStep("verify_otp");
      startOtpTimers();
      showSuccessToast({
        title: copy.resendCode,
        description: formatMessage(copy.enterCodeSentTo, {
          mobile: mobileNumberFormatted || `${ETHIOPIA_MOBILE_COUNTRY_CODE} ${mobile}`,
        }),
      });
    } catch (err) {
      showErrorToast({
        title: copy.errors.resendFailedTitle,
        description: err instanceof Error ? err.message : common.tryAgain,
      });
    } finally {
      setIsResending(false);
    }
  }

  function handleStartOver() {
    setEmailSent(false);
    setMobileStep("request");
    setEmail("");
    setMobile("");
    setMobileNumberFormatted("");
    setOtp("");
    setResetToken("");
    setPassword("");
    setConfirmPassword("");
    setOtpExpiresIn(0);
    setResendCooldownIn(0);
  }

  const showMobileVerifyOtp = !isEmailReset && mobileStep === "verify_otp";
  const showMobileSetPassword = !isEmailReset && mobileStep === "set_password";
  const canResendOtp = resendCooldownIn <= 0 && !isResending;
  const otpExpired = showMobileVerifyOtp && otpExpiresIn <= 0;

  const desktopTitle = showMobileSetPassword
    ? copy.formTitles.setPassword
    : showMobileVerifyOtp
      ? copy.formTitles.verifyCode
      : copy.formTitles.requestReset;

  const desktopDescription = isEmailReset
    ? copy.desktopDescriptions.emailRequest
    : showMobileSetPassword
      ? copy.desktopDescriptions.setPassword
      : showMobileVerifyOtp
        ? copy.desktopDescriptions.verifyOtp
        : copy.desktopDescriptions.mobileRequest;

  const desktopSubtitle = isEmailReset
    ? copy.desktopSubtitles.emailRequest
    : showMobileSetPassword
      ? copy.desktopSubtitles.setPassword
      : showMobileVerifyOtp
        ? copy.desktopSubtitles.verifyOtp
        : copy.desktopSubtitles.mobileRequest;

  const formattedMobileDisplay = `${ETHIOPIA_MOBILE_COUNTRY_CODE} ${mobile}`;
  const emailFieldLabel =
    audience === "admin" && "administratorEmail" in common
      ? common.administratorEmail
      : common.emailAddress;
  const emailFieldPlaceholder =
    audience === "admin" && "emailPlaceholder" in authCopy.signIn
      ? authCopy.signIn.emailPlaceholder || undefined
      : "emailPlaceholder" in common
        ? common.emailPlaceholder || undefined
        : undefined;

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
      desktopDescription={desktopDescription}
      footerCopyright={common.copyright}
      headerActions={<AuthLanguageSwitcher />}
    >
      <div className="hidden lg:block mb-8">
        <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">{copy.formEyebrow}</p>
        <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">{desktopTitle}</h2>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">{desktopSubtitle}</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
        {emailSent ? (
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-[#1C3A34]">{copy.emailSentTitle}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              {formatMessage(copy.emailSentDescription, { email })}
            </p>
            <p className="text-xs text-slate-400">{copy.emailSentHint}</p>
            <button
              type="button"
              onClick={handleStartOver}
              className="text-sm font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors"
            >
              {copy.sendAnotherLink}
            </button>
          </div>
        ) : showMobileSetPassword ? (
          <form className="space-y-5" onSubmit={handlePasswordSubmit}>
            <div>
              <label
                htmlFor="reset-password"
                className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
              >
                {copy.newPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="reset-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                  placeholder={copy.passwordPlaceholder}
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
                htmlFor="reset-confirm-password"
                className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
              >
                {copy.confirmPassword}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                  placeholder={copy.confirmPasswordPlaceholder}
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
                  {copy.updatingPassword}
                </>
              ) : (
                copy.resetPassword
              )}
            </button>
          </form>
        ) : showMobileVerifyOtp ? (
          <form className="space-y-6" onSubmit={handleOtpSubmit}>
            <div className="space-y-4 text-center">
              <p className="text-sm leading-relaxed text-slate-500">
                {formatMessage(copy.enterCodeSentTo, { mobile: formattedMobileDisplay })}
              </p>

              <div className="mx-auto inline-flex items-center gap-2 rounded-xl bg-[#1C3A34]/[0.03] px-3 py-1.5">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                    otpExpired
                      ? "border-red-200/80 bg-red-50"
                      : "border-[#C9B87A]/30 bg-gradient-to-br from-[#C9B87A]/10 to-transparent",
                  )}
                >
                  <Clock
                    className={cn("h-3 w-3", otpExpired ? "text-red-600" : "text-[#1C3A34]")}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {otpExpired ? copy.codeExpired : copy.expiresIn}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums leading-none",
                      otpExpired ? "text-red-600" : "text-[#1C3A34]",
                    )}
                  >
                    {otpExpired ? "0:00" : formatCountdown(otpExpiresIn)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-3 block text-center text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                {copy.verificationCode}
              </label>
              <OtpCodeInput
                idPrefix="reset-otp"
                value={otp}
                onChange={setOtp}
                disabled={isSubmitting || otpExpired}
              />
            </div>

            {otpExpired ? (
              <p className="text-center text-xs leading-relaxed text-slate-400">
                {copy.otpExpiredHint}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6 || otpExpired}
              className="w-full bg-[#1C3A34] hover:bg-[#162e29] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-[15px] py-4 rounded-xl border-b-[3px] border-[#C9B87A] tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#1C3A34]/10 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {copy.verifyingCode}
                </>
              ) : (
                copy.verifyCode
              )}
            </button>

            <div className="flex items-center justify-between gap-6 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={!canResendOtp}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#1C3A34] transition-colors hover:text-[#C9B87A] disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:text-slate-400"
              >
                <RotateCcw className={cn("h-3.5 w-3.5 shrink-0", isResending && "animate-spin")} aria-hidden />
                {isResending
                  ? copy.sending
                  : resendCooldownIn > 0
                    ? formatMessage(copy.resendIn, { time: formatCountdown(resendCooldownIn) })
                    : copy.resendCode}
              </button>

              <button
                type="button"
                onClick={handleStartOver}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition-all hover:border-[#1C3A34]/20 hover:text-[#1C3A34] hover:shadow"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {copy.useDifferentNumber}
              </button>
            </div>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleRequestSubmit}>
            <div
              className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
              role="tablist"
              aria-label={copy.resetMethod}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isEmailReset}
                onClick={() => selectResetMethod("email")}
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-70 ${
                  isEmailReset
                    ? "bg-white text-[#1C3A34] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Mail className="h-4 w-4" />
                {common.email}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isEmailReset}
                onClick={() => selectResetMethod("mobile")}
                disabled={isSubmitting}
                className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-70 ${
                  !isEmailReset
                    ? "bg-white text-[#1C3A34] shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Phone className="h-4 w-4" />
                {common.mobile}
              </button>
            </div>

            <div>
              <label
                htmlFor="reset-identifier"
                className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
              >
                {isEmailReset ? emailFieldLabel : common.mobileNumber}
              </label>
              {isEmailReset ? (
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="reset-identifier"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                    placeholder={emailFieldPlaceholder}
                  />
                </div>
              ) : (
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm focus-within:border-[#1C3A34] focus-within:ring-2 focus-within:ring-[#1C3A34]/20">
                  <div className="flex shrink-0 items-center gap-2 border-r border-slate-200 bg-white px-3 text-sm text-slate-700">
                    <span aria-hidden className="text-base leading-none">
                      🇪🇹
                    </span>
                    <span className="font-semibold tabular-nums">{ETHIOPIA_MOBILE_COUNTRY_CODE}</span>
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      id="reset-identifier"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(sanitizeEthiopianMobileInput(e.target.value))}
                      className="w-full border-0 bg-transparent py-3.5 pl-10 pr-4 text-sm text-slate-800 outline-none"
                      placeholder={common.mobilePlaceholder}
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1C3A34] hover:bg-[#162e29] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-[15px] py-4 rounded-xl border-b-[3px] border-[#C9B87A] tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#1C3A34]/10 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEmailReset ? copy.sendingResetLink : copy.sendingCode}
                </>
              ) : isEmailReset ? (
                copy.sendResetLink
              ) : (
                copy.sendVerificationCode
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
