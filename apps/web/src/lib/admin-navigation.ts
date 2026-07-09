import type { Menu } from "@smart-dispatch/types";
import { ADMIN_PROFILE_PATH } from "./auth-paths";
import { menuPathMatches, resolveActiveMenuPath } from "./menu-navigation";

const ADMIN_EXACT_MATCH_ROOTS = ["/admin"];

export function isAdminNavActive(pathname: string, href: string, allPaths?: string[]) {
  if (allPaths?.length) {
    return resolveActiveMenuPath(pathname, allPaths, ADMIN_EXACT_MATCH_ROOTS) === href;
  }

  return menuPathMatches(pathname, href, ADMIN_EXACT_MATCH_ROOTS);
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

export function buildMenuTree(menus: Menu[]): Menu[] {
  const nodes = new Map(
    menus.map((menu) => [menu.id, { ...menu, children: [] as Menu[] }]),
  );
  const roots: Menu[] = [];

  for (const menu of nodes.values()) {
    if (menu.parent_id && nodes.has(menu.parent_id)) {
      nodes.get(menu.parent_id)!.children!.push(menu);
      continue;
    }
    roots.push(menu);
  }

  const sortMenus = (items: Menu[]) => {
    items.sort((a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug));
    for (const item of items) {
      if (item.children?.length) {
        sortMenus(item.children);
      } else {
        item.children = undefined;
      }
    }
  };

  sortMenus(roots);
  return roots;
}

export function filterMenuTree(menus: Menu[], search: string): Menu[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return menus;
  }

  function matches(menu: Menu) {
    return (
      menu.label.toLowerCase().includes(query) ||
      menu.slug.toLowerCase().includes(query) ||
      (menu.path?.toLowerCase().includes(query) ?? false)
    );
  }

  function filterTree(items: Menu[]): Menu[] {
    const filtered: Menu[] = [];

    for (const item of items) {
      const filteredChildren = item.children?.length ? filterTree(item.children) : [];

      if (matches(item) || filteredChildren.length > 0) {
        filtered.push({
          ...item,
          children: filteredChildren.length
            ? filteredChildren
            : matches(item)
              ? item.children
              : undefined,
        });
      }
    }

    return filtered;
  }

  return filterTree(menus);
}

export type MenuTreeRow = {
  menu: Menu;
  depth: number;
};

export function flattenMenuTree(menus: Menu[], depth = 0): MenuTreeRow[] {
  const rows: MenuTreeRow[] = [];

  for (const menu of menus) {
    rows.push({ menu, depth });
    if (menu.children?.length) {
      rows.push(...flattenMenuTree(menu.children, depth + 1));
    }
  }

  return rows;
}

export function getPageTitleFromMenus(pathname: string, menus: Menu[]) {
  const flatMenus = flattenMenus(menus).filter((menu) => menu.path);
  const paths = flatMenus.map((menu) => menu.path!);
  const activePath = resolveActiveMenuPath(pathname, paths, ADMIN_EXACT_MATCH_ROOTS);
  const match = flatMenus.find((menu) => menu.path === activePath);

  return match?.label ?? "Dashboard";
}

export function isPathAllowed(pathname: string, menus: Menu[]) {
  if (pathname === ADMIN_PROFILE_PATH || pathname.startsWith(`${ADMIN_PROFILE_PATH}/`)) {
    return true;
  }

  const flatMenus = flattenMenus(menus).filter((menu) => menu.path);

  return flatMenus.some((menu) => menuPathMatches(pathname, menu.path!, ADMIN_EXACT_MATCH_ROOTS));
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

export { ADMIN_EXACT_MATCH_ROOTS };
