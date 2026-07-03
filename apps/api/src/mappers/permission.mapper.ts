import type { Permission } from "@smart-dispatch/types";

type DbPermission = {
  id: string;
  slug: string;
  module: string;
  action: string;
  description: string | null;
  createdAt: Date;
};

export function toPublicPermission(permission: DbPermission): Permission {
  return {
    id: permission.id,
    slug: permission.slug,
    module: permission.module,
    action: permission.action,
    description: permission.description,
    created_at: permission.createdAt.toISOString(),
  };
}
