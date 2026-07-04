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
  notifications: {
    read: "notifications.read",
    write: "notifications.write",
    delete: "notifications.delete",
  },
  audit_logs: {
    read: "audit_logs.read",
  },
} as const;

export const ADMIN_PERMISSION_MODULES = Object.keys(PERMISSIONS) as Array<keyof typeof PERMISSIONS>;

export function isAdminAssignablePermission(permission: Permission) {
  return ADMIN_PERMISSION_MODULES.includes(permission.module as keyof typeof PERMISSIONS);
}

export function filterAdminAssignablePermissions(permissions: Permission[]) {
  return permissions.filter(isAdminAssignablePermission);
}

export function createPermissionChecker(permissions: Permission[]) {
  const granted = new Set(permissions.map((permission) => permission.slug));

  return function hasPermission(slug: string) {
    return granted.has(slug);
  };
}
