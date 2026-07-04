import type { Permission } from "@smart-dispatch/types";

export const PERMISSIONS = {
  users: {
    read: "users.read",
    write: "users.write",
    delete: "users.delete",
  },
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
} as const;

export function createPermissionChecker(permissions: Permission[]) {
  const granted = new Set(permissions.map((permission) => permission.slug));

  return function hasPermission(slug: string) {
    return granted.has(slug);
  };
}
