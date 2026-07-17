"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/components/shared/providers/locale-context";
import { AuthRequestError, login, resumeUserSession } from "@/lib/auth-api";
import { USER_DASHBOARD_PATH, USER_FORGOT_PASSWORD_PATH, USER_REGISTER_PATH } from "@/lib/auth-paths";
import { clearAuthSession, saveAuthSession } from "@/lib/auth-session";
import {
  ETHIOPIA_MOBILE_COUNTRY_CODE,
  formatEthiopianMobileNumber,
  sanitizeEthiopianMobileInput,
} from "@/lib/ethiopian-mobile";
import { showErrorToast } from "@/lib/toast";
import { getCustomerAuthMessages } from "@/translations";

type LoginMethod = "email" | "mobile";

type SignInFormError = {
  rejectionReason: string;
};

function getRejectionReason(error: unknown) {
  if (error instanceof AuthRequestError) {
    return error.accountBlockReason?.trim() || null;
  }

  if (error instanceof Error && "accountBlockReason" in error) {
    const reason = (error as Error & { accountBlockReason?: string | null }).accountBlockReason;
    return reason?.trim() || null;
  }

  return null;
}

export default function UserSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const copy = getCustomerAuthMessages(locale);
  const redirect = searchParams.get("redirect");
  const targetRedirect = redirect || USER_DASHBOARD_PATH;

  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [formError, setFormError] = useState<SignInFormError | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      try {
        const session = await resumeUserSession();
        if (cancelled) return;

        if (session) {
          router.replace(targetRedirect);
          return;
        }

        setIsCheckingSession(false);
      } catch {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      }
    }

    void checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [router, targetRedirect]);

  function selectLoginMethod(method: LoginMethod) {
    if (method === loginMethod) return;
    setLoginMethod(method);
    setUsername("");
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
      const usernameValue =
        loginMethod === "email" ? username.trim() : formatEthiopianMobileNumber(username);
      const session = await login(usernameValue, password);

      if (!session.user.roles.includes("user")) {
        clearAuthSession();
        showErrorToast({
          title: copy.signIn.errors.accessDeniedTitle,
          description: copy.signIn.errors.accessDeniedDescription,
        });
        return;
      }

      saveAuthSession(session, remember);
      router.push(targetRedirect);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : copy.signIn.errors.signInFailedDescription;
      const rejectionReason = getRejectionReason(err);

      if (rejectionReason) {
        showErrorToast({
          title: copy.signIn.errors.signInFailedTitle,
          description: message,
        });
        setFormError({ rejectionReason });
        return;
      }

      const isRejected = message.toLowerCase().includes("rejected");
      if (isRejected) {
        showErrorToast({
          title: copy.signIn.errors.signInFailedTitle,
          description: message,
        });
        return;
      }

      showErrorToast({
        title: copy.signIn.errors.signInFailedTitle,
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-[#1C3A34]" />
          {copy.signIn.checkingSession}
        </div>
      </div>
    );
  }

  const isEmailLogin = loginMethod === "email";

  return (
    <>
      <div className="hidden lg:block mb-8">
        <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">{copy.signIn.formEyebrow}</p>
        <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">{copy.signIn.formTitle}</h2>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          {copy.signIn.formDescription}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {formError ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50/80 p-4"
              role="alert"
            >
              <div className="flex gap-3">
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-700/80">
                    {copy.signIn.rejectionReason}
                  </p>
                  <p className="text-sm leading-relaxed text-red-800">{formError.rejectionReason}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
            role="tablist"
            aria-label={copy.signIn.signInMethod}
          >
            <button
              type="button"
              role="tab"
              aria-selected={isEmailLogin}
              onClick={() => selectLoginMethod("email")}
              disabled={isSubmitting}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-70 ${
                isEmailLogin
                  ? "bg-white text-[#1C3A34] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Mail className="h-4 w-4" />
              {copy.common.email}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isEmailLogin}
              onClick={() => selectLoginMethod("mobile")}
              disabled={isSubmitting}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-70 ${
                !isEmailLogin
                  ? "bg-white text-[#1C3A34] shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Phone className="h-4 w-4" />
              {copy.common.mobile}
            </button>
          </div>

          <div>
            <label
              htmlFor="user-username"
              className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
            >
              {isEmailLogin ? copy.common.emailAddress : copy.common.mobileNumber}
            </label>
            {isEmailLogin ? (
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="user-username"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setFormError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all disabled:opacity-70"
                  placeholder={copy.common.emailPlaceholder || undefined}
                />
              </div>
            ) : (
              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm focus-within:border-[#1C3A34] focus-within:ring-2 focus-within:ring-[#1C3A34]/20 disabled:opacity-70">
                <div className="flex shrink-0 items-center gap-2 border-r border-slate-200 bg-white px-3 text-sm text-slate-700">
                  <span aria-hidden className="text-base leading-none">
                    🇪🇹
                  </span>
                  <span className="font-semibold tabular-nums">{ETHIOPIA_MOBILE_COUNTRY_CODE}</span>
                </div>
                <div className="relative min-w-0 flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    id="user-username"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                    value={username}
                    onChange={(e) => {
                      setUsername(sanitizeEthiopianMobileInput(e.target.value));
                      setFormError(null);
                    }}
                    disabled={isSubmitting}
                    className="w-full border-0 bg-transparent py-3.5 pl-10 pr-4 text-sm text-slate-800 outline-none disabled:opacity-70"
                    placeholder={copy.common.mobilePlaceholder}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="user-password"
              className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
            >
              {copy.common.password}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="user-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFormError(null);
                }}
                disabled={isSubmitting}
                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all disabled:opacity-70"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#1C3A34] transition-colors"
                aria-label={showPassword ? copy.common.hidePassword : copy.common.showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="user-remember"
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
                disabled={isSubmitting}
                className="data-checked:border-[#1C3A34] data-checked:bg-[#1C3A34] data-checked:text-white"
              />
              <Label htmlFor="user-remember" className="text-sm text-slate-500 font-normal cursor-pointer">
                {copy.signIn.rememberMe}
              </Label>
            </div>
            <Link
              href={USER_FORGOT_PASSWORD_PATH}
              className="text-sm font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors shrink-0"
            >
              {copy.signIn.forgotPassword}
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1C3A34] hover:bg-[#162e29] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-[15px] py-4 rounded-xl border-b-[3px] border-[#C9B87A] tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#1C3A34]/10 hover:-translate-y-0.5 mt-2 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {copy.signIn.submitting}
              </>
            ) : (
              copy.signIn.submit
            )}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        {copy.signIn.noAccount}{" "}
        <Link
          href={redirect ? `${USER_REGISTER_PATH}?redirect=${encodeURIComponent(redirect)}` : USER_REGISTER_PATH}
          className="font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors"
        >
          {copy.signIn.registerNow}
        </Link>
      </p>
    </>
  );
}
