import type { Permission } from "@smart-dispatch/types";

const ACTION_ORDER = ["read", "write", "delete"] as const;

export type PermissionGroup = {
  module: string;
  permissions: Permission[];
};

export function groupPermissionsByModule(permissions: Permission[]): PermissionGroup[] {
  const groups = new Map<string, Permission[]>();

  for (const permission of permissions) {
    const list = groups.get(permission.module) ?? [];
    list.push(permission);
    groups.set(permission.module, list);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([module, modulePermissions]) => ({
      module,
      permissions: modulePermissions.sort(
        (left, right) =>
          ACTION_ORDER.indexOf(left.action as (typeof ACTION_ORDER)[number]) -
          ACTION_ORDER.indexOf(right.action as (typeof ACTION_ORDER)[number]),
      ),
    }));
}
