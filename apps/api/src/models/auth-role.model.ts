import type { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";

export type ListAuthRolesFilter = {
  userId?: string;
  roleId?: string;
};

const authRoleWithRelationsInclude = {
  user: {
    include: {
      authRoles: {
        include: { role: true },
        orderBy: { role: { slug: "asc" as const } },
      },
    },
  },
  role: true,
} satisfies Prisma.AuthRoleInclude;

function buildAuthRoleWhere(filter?: ListAuthRolesFilter): Prisma.AuthRoleWhereInput {
  const where: Prisma.AuthRoleWhereInput = {};

  if (filter?.userId) {
    where.userId = filter.userId;
  }

  if (filter?.roleId) {
    where.roleId = filter.roleId;
  }

  return where;
}

export async function findAuthRole(userId: string, roleId: string) {
  return prisma.authRole.findUnique({
    where: { userId_roleId: { userId, roleId } },
    include: authRoleWithRelationsInclude,
  });
}

export async function hasUserRole(userId: string, roleId: string) {
  const authRole = await prisma.authRole.findUnique({
    where: { userId_roleId: { userId, roleId } },
    select: { userId: true },
  });
  return Boolean(authRole);
}

export async function listAuthRoles(
  filter?: ListAuthRolesFilter,
  options?: { skip?: number; take?: number },
) {
  return prisma.authRole.findMany({
    where: buildAuthRoleWhere(filter),
    skip: options?.skip,
    take: options?.take,
    orderBy: { assignedAt: "desc" },
    include: authRoleWithRelationsInclude,
  });
}

export async function listAuthRolesByUserId(userId: string) {
  return prisma.authRole.findMany({
    where: { userId },
    include: { role: true },
    orderBy: { role: { slug: "asc" } },
  });
}

export async function listAuthRolesByRoleId(roleId: string) {
  return prisma.authRole.findMany({
    where: { roleId },
    include: { user: true },
    orderBy: { assignedAt: "desc" },
  });
}

export async function countAuthRoles(filter?: ListAuthRolesFilter) {
  return prisma.authRole.count({ where: buildAuthRoleWhere(filter) });
}

export async function assignRoleToUser(userId: string, roleId: string) {
  return prisma.authRole.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: { assignedAt: new Date() },
    create: { userId, roleId },
    include: authRoleWithRelationsInclude,
  });
}

export async function assignRolesToUser(userId: string, roleIds: string[]) {
  const uniqueRoleIds = [...new Set(roleIds)];

  return prisma.$transaction(
    uniqueRoleIds.map((roleId) =>
      prisma.authRole.upsert({
        where: { userId_roleId: { userId, roleId } },
        update: { assignedAt: new Date() },
        create: { userId, roleId },
      }),
    ),
  );
}

export async function replaceUserRoles(userId: string, roleIds: string[]) {
  const uniqueRoleIds = [...new Set(roleIds)];

  return prisma.$transaction(async (tx) => {
    await tx.authRole.deleteMany({ where: { userId } });

    if (uniqueRoleIds.length === 0) {
      return [];
    }

    await tx.authRole.createMany({
      data: uniqueRoleIds.map((roleId) => ({ userId, roleId })),
      skipDuplicates: true,
    });

    return tx.authRole.findMany({
      where: { userId },
      include: authRoleWithRelationsInclude,
      orderBy: { role: { slug: "asc" } },
    });
  });
}

export async function removeRoleFromUser(userId: string, roleId: string) {
  await prisma.authRole.delete({
    where: { userId_roleId: { userId, roleId } },
  });
}

export async function removeAllRolesFromUser(userId: string) {
  return prisma.authRole.deleteMany({ where: { userId } });
}

export async function removeRoleFromAllUsers(roleId: string) {
  return prisma.authRole.deleteMany({ where: { roleId } });
}
