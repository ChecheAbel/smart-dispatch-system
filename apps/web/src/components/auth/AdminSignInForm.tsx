"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { login, resumeAdminSession } from "@/lib/auth-api";
import { ADMIN_DASHBOARD_PATH, ADMIN_FORGOT_PASSWORD_PATH } from "@/lib/auth-paths";
import { clearAuthSession, saveAuthSession } from "@/lib/auth-session";

export default function AdminSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState("");

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const session = await login(email.trim(), password);

      if (!session.user.roles.includes("admin")) {
        clearAuthSession();
        setError("This account does not have administrator access.");
        return;
      }

      saveAuthSession(session, remember);
      router.push(ADMIN_DASHBOARD_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isCheckingSession) {
    return (
      <AuthShell
        mobileTitle="Administrator Sign In"
        desktopEyebrow="— Administrator Portal —"
        desktopTitle={
          <>
            Smart Dispatch{" "}
            <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
              Control Center
            </span>
          </>
        }
        desktopDescription="Secure access for platform administrators to manage bookings, dispatch, fleet operations, and billing."
      >
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#1C3A34]" />
            Checking your session…
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      mobileTitle="Administrator Sign In"
      desktopEyebrow="— Administrator Portal —"
      desktopTitle={
        <>
          Smart Dispatch{" "}
          <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
            Control Center
          </span>
        </>
      }
      desktopDescription="Secure access for platform administrators to manage bookings, dispatch, fleet operations, and billing."
    >
      <div className="hidden lg:block mb-8">
        <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">— Sign In —</p>
        <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">Administrator Access</h2>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          Enter your credentials to access the Smart Dispatch admin console.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="email"
              className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all disabled:opacity-70"
                placeholder="admin@company.com"
              />
            </div>
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
                onCheckedChange={(checked) => setRemember(checked === true)}
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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}

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

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/" className="font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors">
          ← Back to home
        </Link>
      </p>
    </AuthShell>
  );
}
