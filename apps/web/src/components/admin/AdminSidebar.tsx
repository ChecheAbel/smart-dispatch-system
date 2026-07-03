"use client";

import Link from "next/link";
import BrandLogo from "@/components/landing/BrandLogo";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import {
  adminBadgeGoldClass,
  adminEyebrowClass,
} from "@/lib/admin-theme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export default function AdminSidebar() {
  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-sidebar-accent"
        >
          <BrandLogo className="brightness-0 invert" />
        </Link>
        <div className="px-1 pt-3 group-data-[collapsible=icon]:hidden">
          <p className={adminEyebrowClass}>Control Center</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">Administrator console</p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <AdminSidebarNav />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:p-2">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-sidebar-foreground">Smart Dispatch</p>
            <Badge className={adminBadgeGoldClass}>Admin</Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/65">
            Premium mobility platform for EIH.
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
