"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ADMIN_FORGOT_PASSWORD_PATH } from "@/lib/auth-paths";

export default function AdminSignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

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
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
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
                className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
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
                className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C3A34]/20 focus:border-[#1C3A34] transition-all"
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
                onCheckedChange={(checked) => setRemember(checked)}
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
            className="w-full bg-[#1C3A34] hover:bg-[#162e29] text-white font-bold text-[15px] py-4 rounded-xl border-b-[3px] border-[#C9B87A] tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#1C3A34]/10 hover:-translate-y-0.5 mt-2"
          >
            Sign In
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
