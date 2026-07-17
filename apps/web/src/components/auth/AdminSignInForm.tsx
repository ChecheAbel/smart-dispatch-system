"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, Phone } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { login, resumeAdminSession } from "@/lib/auth-api";
import { ADMIN_DASHBOARD_PATH, ADMIN_FORGOT_PASSWORD_PATH } from "@/lib/auth-paths";
import { clearAuthSession, saveAuthSession, getAdminSignInPrefs, saveAdminSignInPrefs, clearAdminSignInPrefs } from "@/lib/auth-session";
import {
  ETHIOPIA_MOBILE_COUNTRY_CODE,
  ETHIOPIAN_MOBILE_PLACEHOLDER,
  formatEthiopianMobileNumber,
  parseStoredEthiopianMobile,
  sanitizeEthiopianMobileInput,
} from "@/lib/ethiopian-mobile";
import { showErrorToast } from "@/lib/toast";

type LoginMethod = "email" | "mobile";

export default function AdminSignInForm() {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>("email");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasLoadedPrefs, setHasLoadedPrefs] = useState(false);

  useEffect(() => {
    const prefs = getAdminSignInPrefs();
    if (prefs) {
      setRemember(true);
      setLoginMethod(prefs.login_method);
      setUsername(
        prefs.login_method === "mobile"
          ? parseStoredEthiopianMobile(prefs.username)
          : prefs.username,
      );
    }
    setHasLoadedPrefs(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      try {
        const session = await resumeAdminSession();
        if (cancelled) return;

        if (session) {
          router.replace(ADMIN_DASHBOARD_PATH);
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
  }, [router]);

  function selectLoginMethod(method: LoginMethod) {
    if (method === loginMethod) return;
    setLoginMethod(method);
    setUsername("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const loginUsername =
        loginMethod === "email" ? username.trim() : formatEthiopianMobileNumber(username);
      const session = await login(loginUsername, password);

      if (!session.user.roles.includes("admin")) {
        clearAuthSession();
        showErrorToast({
          title: "Access denied",
          description: "This account does not have administrator access.",
        });
        return;
      }

      saveAuthSession(session, remember);

      if (remember) {
        saveAdminSignInPrefs({
          login_method: loginMethod,
          username:
            loginMethod === "email" ? username.trim() : sanitizeEthiopianMobileInput(username),
        });
      } else {
        clearAdminSignInPrefs();
      }

      router.push(ADMIN_DASHBOARD_PATH);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign in failed. Please try again.";
      showErrorToast({
        title: "Could not sign in",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession || !hasLoadedPrefs) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-[#1C3A34]" />
          Checking your session…
        </div>
      </div>
    );
  }

  const isEmailLogin = loginMethod === "email";

  return (
    <>
      <div className="hidden lg:block mb-8">
        <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">— Sign In —</p>
        <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">Administrator Access</h2>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          Enter your credentials to access the Smart Dispatch admin console.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div
            className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
            role="tablist"
            aria-label="Sign in method"
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
              Email
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
              Mobile
            </button>
          </div>

          <div>
            <label
              htmlFor="username"
              className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
            >
              {isEmailLogin ? "Email Address" : "Mobile Number"}
            </label>
            {isEmailLogin ? (
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="username"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all disabled:opacity-70"
                  placeholder="admin@company.com"
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
                    id="username"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                    value={username}
                    onChange={(e) => setUsername(sanitizeEthiopianMobileInput(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full border-0 bg-transparent py-3.5 pl-10 pr-4 text-sm text-slate-800 outline-none disabled:opacity-70"
                    placeholder={ETHIOPIAN_MOBILE_PLACEHOLDER}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all disabled:opacity-70"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#1C3A34] transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2.5">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(checked) => {
                  const next = checked === true;
                  setRemember(next);
                  if (!next) {
                    clearAdminSignInPrefs();
                  }
                }}
                disabled={isSubmitting}
                className="data-checked:border-[#1C3A34] data-checked:bg-[#1C3A34] data-checked:text-white"
              />
              <Label htmlFor="remember" className="text-sm text-slate-500 font-normal cursor-pointer">
                Remember me
              </Label>
            </div>
            <Link
              href={ADMIN_FORGOT_PASSWORD_PATH}
              className="text-sm font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors shrink-0"
            >
              Forgot password?
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
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </>
  );
}
