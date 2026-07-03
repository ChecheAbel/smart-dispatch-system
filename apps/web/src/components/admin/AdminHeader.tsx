"use client";

import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, UserRound } from "lucide-react";
import { getUserInitials, useAdminAuth } from "@/components/admin/admin-auth-context";
import AdminLanguageSelector from "@/components/admin/AdminLanguageSelector";
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav";
import {
  adminBadgeGoldClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminTheme,
} from "@/lib/admin-theme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

function getPageTitle(pathname: string) {
  const match = ADMIN_NAV_ITEMS.find((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
  );

  return match?.title ?? "Dashboard";
}

export default function AdminHeader() {
  const pathname = usePathname();
  const { user, signOut } = useAdminAuth();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur supports-backdrop-filter:bg-white/90 sm:px-6">
      <SidebarTrigger
        className="-ml-1 text-[#1C3A34] hover:bg-[#1C3A34]/8"
      />

      <Separator orientation="vertical" className="hidden h-5 sm:block" />

      <div className="min-w-0 flex-1">
        <p className={adminEyebrowClass}>Admin Console</p>
        <h1 className={`truncate text-lg ${adminHeadingClass}`}>{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-2">
        <AdminLanguageSelector />

        <Button
          variant="outline"
          size="icon"
          className="hidden border-slate-200 text-slate-500 hover:bg-slate-50 sm:inline-flex"
          aria-label="Notifications"
        >
          <Bell />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                className="h-10 gap-2 border-slate-200 bg-white px-2.5 text-[#1C3A34] hover:bg-slate-50"
              />
            }
          >
            <Avatar size="sm">
              <AvatarFallback
                className="text-[11px] font-bold text-white"
                style={{ backgroundColor: adminTheme.brand }}
              >
                {getUserInitials(user)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left md:block">
              <p className="max-w-40 truncate text-sm font-semibold text-[#1C3A34]">
                {user.first_name} {user.last_name}
              </p>
              <p className="max-w-40 truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <ChevronDown className="hidden size-4 text-slate-400 md:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#1C3A34]">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs font-normal text-slate-500">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem disabled>
                <UserRound />
                Profile
                <Badge variant="outline" className={`ml-auto text-[10px] ${adminBadgeGoldClass}`}>
                  Soon
                </Badge>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={signOut}>
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
