import type { Menu } from "@smart-dispatch/types";
import { USER_DASHBOARD_PATH, USER_PROFILE_PATH } from "@/lib/auth-paths";
import { flattenMenus } from "@/lib/admin-navigation";
import { menuPathMatches, resolveActiveMenuPath } from "@/lib/menu-navigation";

const CUSTOMER_EXACT_MATCH_ROOTS = [USER_DASHBOARD_PATH];

export function isCustomerNavActive(pathname: string, href: string, allPaths?: string[]) {
  if (allPaths?.length) {
    return resolveActiveMenuPath(pathname, allPaths, CUSTOMER_EXACT_MATCH_ROOTS) === href;
  }

  return menuPathMatches(pathname, href, CUSTOMER_EXACT_MATCH_ROOTS);
}

export function getCustomerPageTitleFromMenus(pathname: string, menus: Menu[]) {
  const flatMenus = flattenMenus(menus).filter((menu) => menu.path);
  const paths = flatMenus.map((menu) => menu.path!);
  const activePath = resolveActiveMenuPath(pathname, paths, CUSTOMER_EXACT_MATCH_ROOTS);
  const match = flatMenus.find((menu) => menu.path === activePath);

  return match?.label ?? "Dashboard";
}

export function isCustomerPathAllowed(pathname: string, menus: Menu[]) {
  if (pathname === USER_PROFILE_PATH || pathname.startsWith(`${USER_PROFILE_PATH}/`)) {
    return true;
  }

  const flatMenus = flattenMenus(menus).filter((menu) => menu.path);

  return flatMenus.some((menu) =>
    menuPathMatches(pathname, menu.path!, CUSTOMER_EXACT_MATCH_ROOTS),
  );
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

export { CUSTOMER_EXACT_MATCH_ROOTS };
