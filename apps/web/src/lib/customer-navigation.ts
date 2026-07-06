import type { Menu } from "@smart-dispatch/types";
import { USER_DASHBOARD_PATH } from "@/lib/auth-paths";
import { flattenMenus } from "@/lib/admin-navigation";

export function isCustomerNavActive(pathname: string, href: string) {
  if (href === USER_DASHBOARD_PATH) {
    return pathname === USER_DASHBOARD_PATH;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getCustomerPageTitleFromMenus(pathname: string, menus: Menu[]) {
  const flatMenus = flattenMenus(menus).filter((menu) => menu.path);

  const match = flatMenus.find((menu) => isCustomerNavActive(pathname, menu.path!));

  return match?.label ?? "Dashboard";
}

export function isCustomerPathAllowed(pathname: string, menus: Menu[]) {
  const flatMenus = flattenMenus(menus).filter((menu) => menu.path);

  return flatMenus.some((menu) => isCustomerNavActive(pathname, menu.path!));
}

export function getCustomerDefaultAllowedPath(menus: Menu[]) {
  const paths = flattenMenus(menus)
    .map((menu) => menu.path)
    .filter((path): path is string => Boolean(path));

  if (paths.includes(USER_DASHBOARD_PATH)) {
    return USER_DASHBOARD_PATH;
  }

  return paths[0] ?? null;
}
