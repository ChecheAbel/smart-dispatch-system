import type { Prisma } from "../generated/prisma";
import { prisma } from "../db/prisma";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export async function setMenuPermissions(
  menuId: string,
  permissionIds: string[],
  client: PrismaClientLike = prisma,
) {
  const uniquePermissionIds = [...new Set(permissionIds)];

  await client.menuPermission.deleteMany({ where: { menuId } });

  if (!uniquePermissionIds.length) {
    return [];
  }

  await client.menuPermission.createMany({
    data: uniquePermissionIds.map((permissionId) => ({
      menuId,
      permissionId,
    })),
    skipDuplicates: true,
  });

  const menuPermissions = await client.menuPermission.findMany({
    where: { menuId },
    orderBy: { permissionId: "asc" },
  });

  return menuPermissions.map((entry) => entry.permissionId);
}
