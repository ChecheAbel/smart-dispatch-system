"use client";

import Link from "next/link";
import { Languages, LogOut, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { User as AuthUser } from "@smart-dispatch/types";
import BrandLogo from "@/components/landing/BrandLogo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LOCALE_OPTIONS, type SupportedLocale } from "@/lib/locale";
import type { BookCopy } from "./book-types";

interface BookHeaderProps {
  scrolled: boolean;
  user: AuthUser | null;
  locale: string;
  setLocale: (l: SupportedLocale) => void;
  copy: BookCopy;
  onSignOut: () => void;
}

export function BookHeader({
  scrolled,
  user,
  locale,
  setLocale,
  copy,
  onSignOut,
}: BookHeaderProps) {
  const getUserInitials = (u: AuthUser) => {
    const first = u.first_name?.trim().charAt(0) ?? "";
    const last = u.last_name?.trim().charAt(0) ?? "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500",
        scrolled
          ? "h-16 bg-[#1C3A34]/90 shadow-lg backdrop-blur-xl dark:bg-[#0d1117]/95 dark:shadow-black/25"
          : "h-20 bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center group shrink-0">
          <BrandLogo priority className="group-hover:opacity-90 transition-opacity drop-shadow-md" />
        </Link>

        <div className="flex items-center gap-4">
          <ThemeToggle
            placement="inline"
            className="auth-theme-toggle-inline h-9 w-9 border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-[#C9B87A] dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-[#C9B87A]"
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full border border-white/10 bg-white/5 text-white shadow-none transition-all hover:scale-105 hover:bg-white/10 hover:text-white dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Select language"
                />
              }
            >
              <Languages className="h-[18px] w-[18px] text-[#C9B87A]" strokeWidth={1.75} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="z-[10000] min-w-40 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#171c24] dark:text-[#e8ecf1] dark:shadow-black/35"
            >
              <DropdownMenuGroup>
                <DropdownMenuRadioGroup
                  value={locale}
                  onValueChange={(value) => setLocale(value as SupportedLocale)}
                >
                  {LOCALE_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-[#dfe5eb] dark:hover:bg-white/[0.06]"
                    >
                      {option.nativeLabel}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {!user ? (
            <Link
              href="/sign-in"
              className="bg-gradient-to-b from-[#C9B87A] to-[#A4945A] hover:from-[#d9ca8e] hover:to-[#B6A46A] text-[#1C3A34] font-bold text-xs sm:text-sm px-6 py-2.5 rounded-full tracking-wide transition-all duration-300 shadow-md hover:shadow-[0_0_15px_-3px_rgba(201,184,122,0.4)] hover:-translate-y-0.5"
            >
              {copy.signIn}
            </Link>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#C9B87A] transition-all hover:scale-105 shadow-md"
                    aria-label="Account menu"
                  />
                }
              >
                <Avatar size="sm" className="size-9 ring-2 ring-[#C9B87A]/50 cursor-pointer">
                  <AvatarFallback className="text-[11px] font-bold text-white bg-gradient-to-br from-[#1C3A34] to-[#122622]">
                    {getUserInitials(user)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="z-[10000] w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#171c24] dark:text-[#e8ecf1] dark:shadow-black/35"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="px-2 py-2 font-normal">
                    <p className="truncate text-sm font-semibold text-[#1C3A34] dark:text-[#C9B87A]">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-[#dfe5eb] dark:hover:bg-white/[0.06]"
                    render={
                      <Link href={user.roles.includes("admin") ? "/admin" : "/dashboard"} />
                    }
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2 text-[#C9B87A]" />
                    Console Dashboard
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={onSignOut}
                    className="cursor-pointer rounded-md px-2 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
