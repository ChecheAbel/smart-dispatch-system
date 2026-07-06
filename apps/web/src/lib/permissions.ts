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
  vehicle_types: {
    read: "vehicle_types.read",
    write: "vehicle_types.write",
    delete: "vehicle_types.delete",
  },
  vehicle_classes: {
    read: "vehicle_classes.read",
    write: "vehicle_classes.write",
    delete: "vehicle_classes.delete",
  },
  vehicles: {
    read: "vehicles.read",
    write: "vehicles.write",
    delete: "vehicles.delete",
  },
  regions: {
    read: "regions.read",
    write: "regions.write",
    delete: "regions.delete",
  },
  locations: {
    read: "locations.read",
    write: "locations.write",
    delete: "locations.delete",
  },
  fare_plans: {
    read: "fare_plans.read",
    write: "fare_plans.write",
    delete: "fare_plans.delete",
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
