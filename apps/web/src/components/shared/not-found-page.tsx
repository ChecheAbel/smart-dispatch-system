"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { User } from "@smart-dispatch/types";
import { ArrowLeft, ArrowRight, Compass, LayoutDashboard, LogOut, UserRound } from "lucide-react";
import { LanguageSelector } from "@/components/shared/layout/language-selector";
import { getUserInitials } from "@/components/shared/providers/auth-context";
import { LocaleProvider, useLocale } from "@/components/shared/providers/locale-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ADMIN_DASHBOARD_PATH,
  ADMIN_PROFILE_PATH,
  USER_DASHBOARD_PATH,
  USER_HOME_PATH,
  USER_PROFILE_PATH,
  USER_REQUESTS_PATH,
  USER_SIGN_IN_PATH,
} from "@/lib/auth-paths";
import { clearAuthSession, getStoredUser } from "@/lib/auth-session";
import { adminTheme } from "@/lib/admin-theme";
import { getTranslations } from "@/translations";
import { cn } from "@/lib/utils";

function resolvePortalPaths(user: User) {
  if (user.roles.includes("admin")) {
    return {
      dashboardPath: ADMIN_DASHBOARD_PATH,
      profilePath: ADMIN_PROFILE_PATH,
    };
  }

  return {
    dashboardPath: USER_DASHBOARD_PATH,
    profilePath: USER_PROFILE_PATH,
  };
}

function NotFoundPageContent() {
  const { locale } = useLocale();
  const copy = getTranslations(locale).common.notFound;
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const portalPaths = user ? resolvePortalPaths(user) : null;

  function handleSignOut() {
    clearAuthSession();
    setUser(null);
    window.location.href = USER_HOME_PATH;
  }

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0f221f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[20%] left-1/2 h-[70vw] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(201,184,122,0.22)_0%,_transparent_58%)] blur-3xl" />
        <div className="absolute -bottom-[10%] -left-[10%] h-[50vw] w-[50vw] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(28,58,52,0.9)_0%,_transparent_60%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,#000_35%,transparent_100%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link href={USER_HOME_PATH} className="inline-flex items-center">
          <Image
            src="/logo.webp"
            alt="Smart Dispatch"
            width={56}
            height={56}
            className="size-14 rounded-lg object-contain"
            priority
          />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSelector
            triggerClassName="text-[#C9B87A] hover:bg-white/10 hover:text-[#e8d69a]"
          />

          {user && portalPaths ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-full border-0 bg-transparent p-0 text-white shadow-none hover:bg-white/10"
                    aria-label="Account menu"
                  />
                }
              >
                <Avatar size="sm" className="size-8 ring-1 ring-[#C9B87A]/45">
                  <AvatarFallback
                    className="text-[11px] font-semibold text-white"
                    style={{ backgroundColor: adminTheme.brand }}
                  >
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-2 font-normal">
                    <p className="truncate text-sm font-semibold text-[#1C3A34]">
                      {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="rounded-md"
                    render={<Link href={portalPaths.profilePath} />}
                  >
                    <UserRound />
                    {copy.profile}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-md"
                    render={<Link href={portalPaths.dashboardPath} />}
                  >
                    <LayoutDashboard />
                    {copy.dashboard}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={handleSignOut}
                    className="rounded-md"
                  >
                    <LogOut />
                    {copy.signOut}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href={USER_SIGN_IN_PATH}
              className="px-2 text-sm font-medium text-[#C9B87A] transition hover:text-[#e8d69a]"
            >
              {copy.signIn}
            </Link>
          )}
        </div>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
        <div className="mb-6 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#C9B87A] backdrop-blur-sm">
          <Compass className="size-6" strokeWidth={2} />
        </div>

        <p className="text-[11px] font-semibold tracking-[0.22em] text-[#C9B87A] uppercase">
          {copy.eyebrow}
        </p>

        <p
          className="mt-4 bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-[6.5rem] leading-none font-extrabold tracking-tight text-transparent sm:text-[8rem]"
          aria-hidden
        >
          {copy.code}
        </p>

        <h1 className="mt-4 max-w-lg text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65 sm:text-base">
          {copy.description}
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={user && portalPaths ? portalPaths.dashboardPath : USER_HOME_PATH}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#C9B87A] px-5 text-sm font-semibold text-[#1C3A34] transition hover:bg-[#e8d69a]",
            )}
          >
            <ArrowLeft className="size-4" />
            {copy.goHome}
          </Link>
          <Link
            href={USER_REQUESTS_PATH}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white/25 hover:bg-white/10",
            )}
          >
            {copy.bookNow}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <LocaleProvider>
      <NotFoundPageContent />
    </LocaleProvider>
  );
}
