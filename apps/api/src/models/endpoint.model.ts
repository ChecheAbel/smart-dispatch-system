import type { HttpMethod } from "../generated/prisma";
import { prisma } from "../db/prisma";

export type CreateEndpointInput = {
  slug: string;
  method: HttpMethod;
  path: string;
  description?: string | null;
  permissionId?: string | null;
  isActive?: boolean;
};

export type UpdateEndpointInput = {
  slug?: string;
  method?: HttpMethod;
  path?: string;
  description?: string | null;
  permissionId?: string | null;
  isActive?: boolean;
};

export type ListEndpointsFilter = {
  search?: string;
  method?: HttpMethod;
  isActive?: boolean;
};

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

function normalizePath(path: string) {
  const trimmed = path.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export async function findEndpointById(id: string) {
  return prisma.endpoint.findUnique({ where: { id } });
}

export async function findEndpointBySlug(slug: string) {
  return prisma.endpoint.findUnique({ where: { slug: normalizeSlug(slug) } });
}

export async function listEndpoints(
  filter?: ListEndpointsFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;
  const search = filter?.search?.trim();

  return prisma.endpoint.findMany({
    where: {
      AND: [
        filter?.method ? { method: filter.method } : {},
        filter?.isActive === undefined ? {} : { isActive: filter.isActive },
        search
          ? {
              OR: [
                { slug: { contains: search, mode: "insensitive" } },
                { path: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    skip,
    take,
    orderBy: [{ path: "asc" }, { method: "asc" }],
  });
}

export async function countEndpoints(filter?: ListEndpointsFilter) {
  const search = filter?.search?.trim();

  return prisma.endpoint.count({
    where: {
      AND: [
        filter?.method ? { method: filter.method } : {},
        filter?.isActive === undefined ? {} : { isActive: filter.isActive },
        search
          ? {
              OR: [
                { slug: { contains: search, mode: "insensitive" } },
                { path: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
  });
}

export async function createEndpoint(input: CreateEndpointInput) {
  return prisma.endpoint.create({
    data: {
      slug: normalizeSlug(input.slug),
      method: input.method,
      path: normalizePath(input.path),
      description: input.description?.trim() || null,
      permissionId: input.permissionId ?? null,
      isActive: input.isActive ?? true,
    },
  });
}

export async function updateEndpoint(endpointId: string, input: UpdateEndpointInput) {
  return prisma.endpoint.update({
    where: { id: endpointId },
    data: {
      slug: input.slug === undefined ? undefined : normalizeSlug(input.slug),
      method: input.method,
      path: input.path === undefined ? undefined : normalizePath(input.path),
      description: input.description === undefined ? undefined : input.description?.trim() || null,
      permissionId: input.permissionId === undefined ? undefined : input.permissionId,
      isActive: input.isActive,
    },
  });
}

export async function deleteEndpoint(endpointId: string) {
  return prisma.endpoint.delete({ where: { id: endpointId } });
}
