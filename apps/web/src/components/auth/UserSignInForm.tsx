"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AuthRequestError, login, resumeUserSession } from "@/lib/auth-api";
import { USER_HOME_PATH, USER_REGISTER_PATH } from "@/lib/auth-paths";
import { clearAuthSession, saveAuthSession } from "@/lib/auth-session";
import { showErrorToast } from "@/lib/toast";

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
  const [email, setEmail] = useState("");
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
          router.replace(USER_HOME_PATH);
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
    setIsSubmitting(true);
    setFormError(null);

    try {
      const session = await login(email.trim(), password);

      if (!session.user.roles.includes("user")) {
        clearAuthSession();
        showErrorToast({
          title: "Access denied",
          description: "This sign-in page is for customer accounts. Use the administrator portal if you manage the platform.",
        });
        return;
      }

      saveAuthSession(session, remember);
      router.push(USER_HOME_PATH);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Sign in failed. Please try again.";
      const rejectionReason = getRejectionReason(err);

      if (rejectionReason) {
        showErrorToast({
          title: "Could not sign in",
          description: message,
        });
        setFormError({ rejectionReason });
        return;
      }

      const isRejected = message.toLowerCase().includes("rejected");
      if (isRejected) {
        showErrorToast({
          title: "Could not sign in",
          description: message,
        });
        return;
      }

      showErrorToast({
        title: "Could not sign in",
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
          Checking your session…
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="hidden lg:block mb-8">
        <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">— Sign In —</p>
        <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">Welcome back</h2>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          Enter your credentials to access your Smart Dispatch account.
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
                    Reason for rejection
                  </p>
                  <p className="text-sm leading-relaxed text-red-800">{formError.rejectionReason}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <label
              htmlFor="user-email"
              className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="user-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFormError(null);
                }}
                disabled={isSubmitting}
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all disabled:opacity-70"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="user-password"
              className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
            >
              Password
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
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <Checkbox
              id="user-remember"
              checked={remember}
              onCheckedChange={(checked) => setRemember(checked === true)}
              disabled={isSubmitting}
              className="data-checked:border-[#1C3A34] data-checked:bg-[#1C3A34] data-checked:text-white"
            />
            <Label htmlFor="user-remember" className="text-sm text-slate-500 font-normal cursor-pointer">
              Remember me
            </Label>
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

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href={USER_REGISTER_PATH}
          className="font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors"
        >
          Register now
        </Link>
      </p>
    </>
  );
}
