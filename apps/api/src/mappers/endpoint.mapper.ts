import type { Endpoint, HttpMethod } from "@smart-dispatch/types";

type DbEndpoint = {
  id: string;
  slug: string;
  method: HttpMethod;
  path: string;
  description: string | null;
  permissionId: string | null;
  isActive: boolean;
  createdAt: Date;
};

export function toPublicEndpoint(endpoint: DbEndpoint): Endpoint {
  return {
    id: endpoint.id,
    slug: endpoint.slug,
    method: endpoint.method,
    path: endpoint.path,
    description: endpoint.description,
    permission_id: endpoint.permissionId,
    is_active: endpoint.isActive,
    created_at: endpoint.createdAt.toISOString(),
  };
}
