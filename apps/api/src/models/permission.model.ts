import { prisma } from "../db/prisma";

export type CreatePermissionInput = {
  slug: string;
  module: string;
  action: string;
  description?: string | null;
};

export type UpdatePermissionInput = {
  slug?: string;
  module?: string;
  action?: string;
  description?: string | null;
};

export type ListPermissionsFilter = {
  search?: string;
  module?: string;
};

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

export async function findPermissionById(id: string) {
  return prisma.permission.findUnique({ where: { id } });
}

export async function findPermissionBySlug(slug: string) {
  return prisma.permission.findUnique({ where: { slug: normalizeSlug(slug) } });
}

export async function listPermissions(
  filter?: ListPermissionsFilter,
  options?: { skip?: number; take?: number },
) {
  const skip = options?.skip ?? 0;
  const take = options?.take ?? 20;
  const search = filter?.search?.trim();
  const module = filter?.module?.trim();

  return prisma.permission.findMany({
    where: {
      AND: [
        module ? { module: { equals: module, mode: "insensitive" } } : {},
        search
          ? {
              OR: [
                { slug: { contains: search, mode: "insensitive" } },
                { module: { contains: search, mode: "insensitive" } },
                { action: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    skip,
    take,
    orderBy: [{ module: "asc" }, { action: "asc" }],
  });
}

export async function countPermissions(filter?: ListPermissionsFilter) {
  const search = filter?.search?.trim();
  const module = filter?.module?.trim();

  return prisma.permission.count({
    where: {
      AND: [
        module ? { module: { equals: module, mode: "insensitive" } } : {},
        search
          ? {
              OR: [
                { slug: { contains: search, mode: "insensitive" } },
                { module: { contains: search, mode: "insensitive" } },
                { action: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
  });
}

export async function createPermission(input: CreatePermissionInput) {
  return prisma.permission.create({
    data: {
      slug: normalizeSlug(input.slug),
      module: input.module.trim().toLowerCase(),
      action: input.action.trim().toLowerCase(),
      description: input.description?.trim() || null,
    },
  });
}

export async function updatePermission(permissionId: string, input: UpdatePermissionInput) {
  return prisma.permission.update({
    where: { id: permissionId },
    data: {
      slug: input.slug === undefined ? undefined : normalizeSlug(input.slug),
      module: input.module === undefined ? undefined : input.module.trim().toLowerCase(),
      action: input.action === undefined ? undefined : input.action.trim().toLowerCase(),
      description: input.description === undefined ? undefined : input.description?.trim() || null,
    },
  });
}

export async function deletePermission(permissionId: string) {
  return prisma.permission.delete({ where: { id: permissionId } });
}

export async function findPermissionsByRoleId(roleId: string) {
  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
    orderBy: { permission: { slug: "asc" } },
  });

  return rolePermissions.map((entry) => entry.permission);
}

export async function userHasPermission(userId: string, permissionSlug: string) {
  const permissions = await findPermissionsByUserId(userId);
  return permissions.some((permission) => permission.slug === permissionSlug);
}

export async function findPermissionsByUserId(userId: string) {
  const authRoles = await prisma.authRole.findMany({
    where: { userId },
    select: { roleId: true },
  });

  const roleIds = authRoles.map((entry) => entry.roleId);
  if (!roleIds.length) return [];

  const rolePermissions = await prisma.rolePermission.findMany({
    where: { roleId: { in: roleIds } },
    include: { permission: true },
  });

  const unique = new Map<string, (typeof rolePermissions)[number]["permission"]>();
  for (const entry of rolePermissions) {
    unique.set(entry.permission.id, entry.permission);
  }

  return Array.from(unique.values()).sort((left, right) => left.slug.localeCompare(right.slug));
}
