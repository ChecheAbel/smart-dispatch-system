"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/components/shared/providers";
import { CUSTOMER_NAV_ITEMS, isCustomerNavActive } from "@/lib/customer-navigation";
import { adminNavButtonClass } from "@/lib/admin-theme";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getCustomerShellMessages } from "@/translations";

export function CustomerSidebarNav() {
  const pathname = usePathname();
  const { locale } = useLocale();
  const copy = getCustomerShellMessages(locale);

  return (
    <SidebarMenu className="gap-1.5 px-2 py-2">
      {CUSTOMER_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const label = copy.nav[item.labelKey];

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={isCustomerNavActive(pathname, item.href)}
              tooltip={label}
              size="lg"
              className={adminNavButtonClass}
              render={<Link href={item.href} />}
            >
              <Icon />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
