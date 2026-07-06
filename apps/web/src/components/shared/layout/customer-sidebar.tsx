"use client";

import Link from "next/link";
import BrandLogo from "@/components/landing/BrandLogo";
import { CustomerSidebarNav } from "@/components/shared/layout/customer-sidebar-nav";
import { useLocale } from "@/components/shared/providers";
import { adminBadgeGoldClass, adminEyebrowClass } from "@/lib/admin-theme";
import { USER_DASHBOARD_PATH } from "@/lib/auth-paths";
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
import { getCustomerShellMessages } from "@/translations";

export function CustomerSidebar() {
  const { locale } = useLocale();
  const copy = getCustomerShellMessages(locale);

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link
          href={USER_DASHBOARD_PATH}
          className="flex items-center gap-3 rounded-lg px-1 py-1 transition-colors hover:bg-sidebar-accent"
        >
          <BrandLogo className="brightness-0 invert" />
        </Link>
        <div className="px-1 pt-3 group-data-[collapsible=icon]:hidden">
          <p className={adminEyebrowClass}>{copy.sidebar.eyebrow}</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">{copy.sidebar.subtitle}</p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1">
        <SidebarGroup className="p-3">
          <SidebarGroupLabel className="mb-1 px-2 text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden">
            {copy.sidebar.navigationLabel}
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-1">
            <CustomerSidebarNav />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:p-2">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-3 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-sidebar-foreground">{copy.sidebar.footerTitle}</p>
            <Badge className={adminBadgeGoldClass}>{copy.sidebar.footerBadge}</Badge>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/65">
            {copy.sidebar.footerDescription}
          </p>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
