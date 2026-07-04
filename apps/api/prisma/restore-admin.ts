import { prisma } from "../src/db/prisma";
import { restoreAdminRolePermissions } from "../src/db/seed-access";

async function restoreAdminRole(emailArg?: string) {
  const email = (emailArg ?? process.env.SEED_ADMIN_EMAIL)?.trim().toLowerCase();

  if (!email) {
    console.error(
      "Provide an admin email: pnpm db:restore-admin <email> or set SEED_ADMIN_EMAIL in .env",
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      authRoles: {
        include: { role: true },
      },
    },
  });

  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } });
  if (!adminRole) {
    console.error('Role with slug "admin" was not found. Run pnpm db:seed first.');
    process.exit(1);
  }

  const alreadyAdmin = user.authRoles.some((entry) => entry.role.slug === "admin");

  if (!alreadyAdmin) {
    await prisma.authRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });
  }

  const permissionCount = await restoreAdminRolePermissions();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      accountStatus: "active",
      accountActivation: "activated",
    },
  });

  const roles = await prisma.authRole.findMany({
    where: { userId: user.id },
    include: { role: true },
    orderBy: { role: { slug: "asc" } },
  });

  console.log(`[Restore] Administrator access restored for ${email}`);
  console.log(`[Restore] Roles: ${roles.map((entry) => entry.role.slug).join(", ") || "none"}`);
  console.log(`[Restore] Admin role permissions restored: ${permissionCount}`);
}

const email = process.argv[2];

restoreAdminRole(email)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
