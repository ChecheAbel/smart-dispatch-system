import type { Permission } from "@smart-dispatch/types";

export const PERMISSIONS = {
  roles: {
    read: "roles.read",
    write: "roles.write",
    delete: "roles.delete",
  },
} as const;

export function createPermissionChecker(permissions: Permission[]) {
  const granted = new Set(permissions.map((permission) => permission.slug));

  return function hasPermission(slug: string) {
    return granted.has(slug);
  };
}
