import { prisma } from "../db/prisma";

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
