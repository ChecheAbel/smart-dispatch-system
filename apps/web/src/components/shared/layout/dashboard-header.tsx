"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { getUserInitials, useAuth } from "@/components/shared/providers/auth-context";
import { LanguageSelector } from "@/components/shared/layout/language-selector";
import { useNavigation } from "@/components/shared/providers/navigation-context";
import { ADMIN_PROFILE_PATH } from "@/lib/auth-paths";
import {
  adminEyebrowClass,
  adminHeaderActionsClass,
  adminHeaderIconButtonClass,
  adminHeadingClass,
  adminTheme,
} from "@/lib/admin-theme";
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { getPageTitle } = useNavigation();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur supports-backdrop-filter:bg-white/90 sm:px-6">
      <SidebarTrigger className="-ml-1 text-[#1C3A34] hover:bg-[#1C3A34]/8" />

      <Separator orientation="vertical" className="hidden h-5 sm:block" />

      <div className="min-w-0 flex-1">
        <p className={adminEyebrowClass}>Admin Console</p>
        <h1 className={`truncate text-lg ${adminHeadingClass}`}>{pageTitle}</h1>
      </div>

      <div className={adminHeaderActionsClass}>
        <LanguageSelector />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={adminHeaderIconButtonClass}
                aria-label="Account menu"
              />
            }
          >
            <Avatar size="sm" className="size-8 ring-1 ring-[#C9B87A]/35">
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
                  {user.first_name} {user.last_name}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuItem className="rounded-md" render={<Link href={ADMIN_PROFILE_PATH} />}>
                <UserRound />
                Profile
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={signOut} className="rounded-md">
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
