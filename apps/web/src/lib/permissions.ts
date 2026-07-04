import type { Permission } from "@smart-dispatch/types";

export const PERMISSIONS = {
  roles: {
    read: "roles.read",
    write: "roles.write",
    delete: "roles.delete",
  },
  menus: {
    read: "menus.read",
    write: "menus.write",
    delete: "menus.delete",
  },
  permissions: {
    read: "permissions.read",
    write: "permissions.write",
    delete: "permissions.delete",
  },
  endpoints: {
    read: "endpoints.read",
    write: "endpoints.write",
    delete: "endpoints.delete",
  },
} as const;

export function createPermissionChecker(permissions: Permission[]) {
  const granted = new Set(permissions.map((permission) => permission.slug));

  return function hasPermission(slug: string) {
    return granted.has(slug);
  };
}
