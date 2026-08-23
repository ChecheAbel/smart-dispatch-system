import { prisma } from "../db/prisma";

export async function ensureRolePermissions(
  roleId: string,
  permissionIds: string[],
  options?: { addMissing?: boolean },
) {
  const uniquePermissionIds = [...new Set(permissionIds)];
  const existingCount = await prisma.rolePermission.count({ where: { roleId } });

  if (existingCount === 0) {
    await setRolePermissions(roleId, uniquePermissionIds);
    return {
      initialized: true as const,
      skipped: false as const,
      added: uniquePermissionIds.length,
      applied: uniquePermissionIds.length,
    };
  }

  if (!options?.addMissing || uniquePermissionIds.length === 0) {
    return { initialized: false as const, skipped: true as const, added: 0, applied: existingCount };
  }

  const result = await prisma.rolePermission.createMany({
    data: uniquePermissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    })),
    skipDuplicates: true,
  });

  return {
    initialized: false as const,
    skipped: result.count === 0,
    added: result.count,
    applied: existingCount + result.count,
  };
}

export async function setRolePermissions(roleId: string, permissionIds: string[]) {
  const uniquePermissionIds = [...new Set(permissionIds)];

  return prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({ where: { roleId } });

    if (!uniquePermissionIds.length) {
      return [];
    }

    await tx.rolePermission.createMany({
      data: uniquePermissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
      skipDuplicates: true,
    });

    const rolePermissions = await tx.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
      orderBy: { permission: { slug: "asc" } },
    });

    return rolePermissions.map((entry) => entry.permission);
  });
}

export async function addRolePermission(roleId: string, permissionId: string) {
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: { roleId, permissionId },
    },
    update: {},
    create: { roleId, permissionId },
  });
}

export async function removeRolePermission(roleId: string, permissionId: string) {
  await prisma.rolePermission.delete({
    where: {
      roleId_permissionId: { roleId, permissionId },
    },
  });
}
