"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@smart-dispatch/types";
import { ADMIN_SIGN_IN_PATH } from "@/lib/auth-paths";
import { clearAuthSession, getStoredUser } from "@/lib/auth-session";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = getStoredUser();

    if (!storedUser || !storedUser.roles.includes("admin")) {
      router.replace(ADMIN_SIGN_IN_PATH);
      return;
    }

    setUser(storedUser);
  }, [router]);

  function handleSignOut() {
    clearAuthSession();
    router.replace(ADMIN_SIGN_IN_PATH);
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9B87A]">Admin Console</p>
            <h1 className="text-xl font-extrabold text-[#1C3A34]">Smart Dispatch</h1>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#1C3A34] hover:border-[#1C3A34] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-[#1C3A34]">
            Welcome, {user.first_name} {user.last_name}
          </h2>
          <p className="mt-2 text-slate-500">
            You are signed in as <span className="font-medium text-slate-700">{user.email}</span>.
          </p>
          <p className="mt-6 text-sm text-slate-500">
            The admin dashboard modules will appear here. Navigation and permissions can be loaded from the API next.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-sm font-semibold text-[#1C3A34] hover:text-[#C9B87A] transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
