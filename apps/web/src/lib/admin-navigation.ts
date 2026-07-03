import type { Menu } from "@smart-dispatch/types";

export function isAdminNavActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function flattenMenus(menus: Menu[]): Menu[] {
  const items: Menu[] = [];

  for (const menu of menus) {
    items.push(menu);
    if (menu.children?.length) {
      items.push(...flattenMenus(menu.children));
    }
  }

  return items;
}

export function getPageTitleFromMenus(pathname: string, menus: Menu[]) {
  const flatMenus = flattenMenus(menus).filter((menu) => menu.path);

  const match = flatMenus.find((menu) =>
    menu.path === "/admin" ? pathname === "/admin" : pathname.startsWith(menu.path!),
  );

  return match?.label ?? "Dashboard";
}

export function isPathAllowed(pathname: string, menus: Menu[]) {
  const flatMenus = flattenMenus(menus).filter((menu) => menu.path);

  return flatMenus.some((menu) => isAdminNavActive(pathname, menu.path!));
}

export function getDefaultAllowedPath(menus: Menu[]) {
  const paths = flattenMenus(menus)
    .map((menu) => menu.path)
    .filter((path): path is string => Boolean(path));

  if (paths.includes("/admin")) {
    return "/admin";
  }

  return paths[0] ?? null;
}
