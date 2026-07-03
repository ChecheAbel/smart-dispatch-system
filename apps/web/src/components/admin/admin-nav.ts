import type { LucideIcon } from "lucide-react";
import {
  Key,
  LayoutDashboard,
  Menu,
  Route,
  Shield,
  Users,
} from "lucide-react";

export type AdminNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Roles", href: "/admin/roles", icon: Shield },
  { title: "Permissions", href: "/admin/permissions", icon: Key },
  { title: "Menus", href: "/admin/menus", icon: Menu },
  { title: "Endpoints", href: "/admin/endpoints", icon: Route },
];

export function isAdminNavActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
