"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { requestPasswordReset } from "@/lib/auth-api";
import { ADMIN_SIGN_IN_PATH } from "@/lib/auth-paths";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      mobileTitle="Password Reset"
      desktopEyebrow="— Email Invitation —"
      desktopTitle={
        <>
          Reset via{" "}
          <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
            Email Invitation
          </span>
        </>
      }
      desktopDescription="Enter your administrator email and we'll send a secure invitation link to reset your password."
    >
      <div className="hidden lg:block mb-8">
        <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">— Forgot Password —</p>
        <h2 className="text-3xl font-extrabold text-[#1C3A34] tracking-tight">Request Reset Link</h2>
        <p className="mt-2 text-slate-500 text-sm leading-relaxed">
          We&apos;ll email you an invitation with a link to create a new password.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
        {sent ? (
          <div className="text-center space-y-4 py-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-[#1C3A34]">Check your email</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              If an administrator account exists for{" "}
              <span className="font-semibold text-slate-700">{email}</span>, you&apos;ll receive a password reset
              invitation shortly. The link expires in 1 hour.
            </p>
            <p className="text-xs text-slate-400">
              Didn&apos;t receive it? Check your spam folder or try again.
            </p>
            <button
              type="button"
              onClick={() => {
                setSent(false);
                setEmail("");
              }}
              className="text-sm font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors"
            >
              Send another invitation
            </button>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="reset-email"
                className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2"
              >
                Administrator Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
                  placeholder="admin@company.com"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1C3A34] hover:bg-[#162e29] disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold text-[15px] py-4 rounded-xl border-b-[3px] border-[#C9B87A] tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#1C3A34]/10 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending invitation…
                </>
              ) : (
                "Send Reset Invitation"
              )}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href={ADMIN_SIGN_IN_PATH} className="font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors">
          ← Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
