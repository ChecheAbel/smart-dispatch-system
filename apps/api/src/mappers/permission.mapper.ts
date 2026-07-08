import type { Permission, PermissionEndpoint } from "@smart-dispatch/types";

type DbPermissionEndpoint = {
  method: string;
  path: string;
  description: string | null;
};

type DbPermission = {
  id: string;
  slug: string;
  module: string;
  action: string;
  description: string | null;
  createdAt: Date;
  endpoints?: DbPermissionEndpoint[];
};

export function toPublicPermission(permission: DbPermission): Permission {
  const endpoints: PermissionEndpoint[] | undefined = permission.endpoints
    ? permission.endpoints.map((endpoint) => ({
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
      }))
    : undefined;

  return {
    id: permission.id,
    slug: permission.slug,
    module: permission.module,
    action: permission.action,
    description: permission.description,
    created_at: permission.createdAt.toISOString(),
    ...(endpoints ? { endpoints } : {}),
  };
}
