import type { Menu } from "@smart-dispatch/types";

export type NavigationPortal = "admin" | "customer";

const CUSTOMER_PATH_PREFIX = "/dashboard";
const ADMIN_PATH_PREFIX = "/admin";

function isCustomerMenuPath(path: string | null | undefined) {
  return Boolean(path?.startsWith(CUSTOMER_PATH_PREFIX));
}

function isAdminMenuPath(path: string | null | undefined) {
  return !path || path.startsWith(ADMIN_PATH_PREFIX);
}

export function filterMenusForPortal(menus: Menu[], portal: NavigationPortal): Menu[] {
  return menus
    .map((menu) => ({
      ...menu,
      children: menu.children?.length ? filterMenusForPortal(menu.children, portal) : undefined,
    }))
    .filter((menu) => {
      if (portal === "customer") {
        if (menu.path && isCustomerMenuPath(menu.path)) {
          return true;
        }

        return Boolean(menu.children?.length);
      }

      if (menu.path && isCustomerMenuPath(menu.path)) {
        return false;
      }

      if (menu.path && !isAdminMenuPath(menu.path)) {
        return false;
      }

      if (menu.children?.length) {
        return true;
      }

      return Boolean(menu.path);
    });
}
