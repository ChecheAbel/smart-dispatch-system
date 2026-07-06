import type { LucideIcon } from "lucide-react";
import { LayoutDashboard } from "lucide-react";
import { USER_DASHBOARD_PATH } from "@/lib/auth-paths";

export type CustomerNavItem = {
  labelKey: "dashboard";
  href: string;
  icon: LucideIcon;
};

export const CUSTOMER_NAV_ITEMS: CustomerNavItem[] = [
  {
    labelKey: "dashboard",
    href: USER_DASHBOARD_PATH,
    icon: LayoutDashboard,
  },
];

export function isCustomerNavActive(pathname: string, href: string) {
  if (href === USER_DASHBOARD_PATH) {
    return pathname === USER_DASHBOARD_PATH;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getCustomerPageTitleKey(pathname: string): "dashboard" | "portal" {
  if (pathname === USER_DASHBOARD_PATH) {
    return "dashboard";
  }

  return "portal";
}
