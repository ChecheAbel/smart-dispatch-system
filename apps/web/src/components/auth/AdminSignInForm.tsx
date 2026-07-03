"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import BrandLogo from "@/components/landing/BrandLogo";

export default function AdminSignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden lg:flex lg:w-[45%] xl:w-[42%] flex-col justify-between overflow-hidden bg-[#1C3A34] p-10 xl:p-14">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_65%)]" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(28,58,52,0.9)_1px,transparent_1px),linear-gradient(to_bottom,rgba(28,58,52,0.9)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)] opacity-30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C9B87A] opacity-[0.04] rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10">
          <BrandLogo priority className="h-10" />
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase">— Administrator Portal —</p>
          <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">
            Smart Dispatch{" "}
            <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
              Control Center
            </span>
          </h1>
          <p className="text-white/55 text-lg leading-relaxed">
            Secure access for platform administrators to manage bookings, dispatch, fleet operations, and billing.
          </p>
        </div>

        <p className="relative z-10 text-white/25 text-xs">
          &copy; {new Date().getFullYear()} Ethiopian Investment Holdings
        </p>
      </div>

      {/* Sign-in panel */}
      <div className="flex-1 flex flex-col min-h-[100dvh] bg-[#f8f7f4]">
        <div className="lg:hidden relative overflow-hidden bg-[#1C3A34] px-4 sm:px-6 py-8 text-center">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(201,184,122,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(201,184,122,0.04)_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <BrandLogo priority className="h-9" />
            <p className="text-[#C9B87A] font-bold text-[10px] tracking-[0.2em] uppercase">Administrator Sign In</p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
          <div className="w-full max-w-md">
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
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#1C3A34] focus:ring-[#1C3A34]/20"
                    />
                    <span className="text-sm text-slate-500">Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors"
                  >
                    Forgot password?
                  </button>
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
          </div>
        </div>
      </div>
    </div>
  );
}
