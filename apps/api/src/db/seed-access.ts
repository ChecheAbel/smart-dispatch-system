import type { HttpMethod } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { menuTranslationInputsToMap } from "../types/menu-translations";
import type { Prisma } from "../generated/prisma";

const DEFAULT_PERMISSIONS = [
  { slug: "users.read", module: "users", action: "read", description: "View users" },
  { slug: "users.write", module: "users", action: "write", description: "Create and update users" },
  { slug: "users.delete", module: "users", action: "delete", description: "Delete users" },
  { slug: "roles.read", module: "roles", action: "read", description: "View roles" },
  { slug: "roles.write", module: "roles", action: "write", description: "Create and update roles" },
  { slug: "permissions.read", module: "permissions", action: "read", description: "View permissions" },
  { slug: "permissions.write", module: "permissions", action: "write", description: "Manage permissions" },
  { slug: "menus.read", module: "menus", action: "read", description: "View menus" },
  { slug: "menus.write", module: "menus", action: "write", description: "Manage menus" },
  { slug: "endpoints.read", module: "endpoints", action: "read", description: "View API endpoints" },
  { slug: "endpoints.write", module: "endpoints", action: "write", description: "Manage API endpoints" },
] as const;

const DEFAULT_MENUS = [
  {
    slug: "dashboard",
    path: "/admin",
    icon: "layout-dashboard",
    sortOrder: 0,
    permissionSlug: null,
    translations: [
      { locale: "en", label: "Dashboard" },
      { locale: "am", label: "ዳሽቦርድ" },
    ],
  },
  {
    slug: "users",
    path: "/admin/users",
    icon: "users",
    sortOrder: 10,
    permissionSlug: "users.read",
    translations: [
      { locale: "en", label: "Users" },
      { locale: "am", label: "ተጠቃሚዎች" },
    ],
  },
  {
    slug: "roles",
    path: "/admin/roles",
    icon: "shield",
    sortOrder: 20,
    permissionSlug: "roles.read",
    translations: [
      { locale: "en", label: "Roles" },
      { locale: "am", label: "ሚናዎች" },
    ],
  },
  {
    slug: "permissions",
    path: "/admin/permissions",
    icon: "key",
    sortOrder: 30,
    permissionSlug: "permissions.read",
    translations: [
      { locale: "en", label: "Permissions" },
      { locale: "am", label: "ፈቃዶች" },
    ],
  },
  {
    slug: "menus",
    path: "/admin/menus",
    icon: "menu",
    sortOrder: 40,
    permissionSlug: "menus.read",
    translations: [
      { locale: "en", label: "Menus" },
      { locale: "am", label: "ሜኑዎች" },
    ],
  },
  {
    slug: "endpoints",
    path: "/admin/endpoints",
    icon: "route",
    sortOrder: 50,
    permissionSlug: "endpoints.read",
    translations: [
      { locale: "en", label: "Endpoints" },
      { locale: "am", label: "ኤንድፖይንቶች" },
    ],
  },
] as const;

const DEFAULT_ENDPOINTS: Array<{
  slug: string;
  method: HttpMethod;
  path: string;
  description: string;
  permissionSlug: string;
}> = [
  { slug: "users.list", method: "GET", path: "/api/users", description: "List users", permissionSlug: "users.read" },
  { slug: "users.create", method: "POST", path: "/api/users", description: "Create user", permissionSlug: "users.write" },
  { slug: "roles.list", method: "GET", path: "/api/roles", description: "List roles", permissionSlug: "roles.read" },
  { slug: "permissions.list", method: "GET", path: "/api/permissions", description: "List permissions", permissionSlug: "permissions.read" },
  { slug: "menus.navigation", method: "GET", path: "/api/menus/navigation", description: "Navigation menu for current user", permissionSlug: "menus.read" },
  { slug: "endpoints.list", method: "GET", path: "/api/endpoints", description: "List endpoints", permissionSlug: "endpoints.read" },
];

async function seedPermissions() {
  const permissionIds: string[] = [];

  for (const permission of DEFAULT_PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { slug: permission.slug },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
    permissionIds.push(record.id);
  }

  return permissionIds;
}

async function seedMenus() {
  const permissions = await prisma.permission.findMany();
  const permissionBySlug = new Map(permissions.map((permission) => [permission.slug, permission.id]));

  for (const menu of DEFAULT_MENUS) {
    const translations = menuTranslationInputsToMap(
      menu.translations.map((translation) => ({ ...translation })),
    ) as Prisma.InputJsonValue;

    await prisma.menu.upsert({
      where: { slug: menu.slug },
      update: {
        path: menu.path,
        icon: menu.icon,
        sortOrder: menu.sortOrder,
        permissionId: menu.permissionSlug ? permissionBySlug.get(menu.permissionSlug) ?? null : null,
        translations,
        isActive: true,
      },
      create: {
        slug: menu.slug,
        path: menu.path,
        icon: menu.icon,
        sortOrder: menu.sortOrder,
        permissionId: menu.permissionSlug ? permissionBySlug.get(menu.permissionSlug) ?? null : null,
        translations,
        isActive: true,
      },
    });
  }
}

async function seedEndpoints() {
  const permissions = await prisma.permission.findMany();
  const permissionBySlug = new Map(permissions.map((permission) => [permission.slug, permission.id]));

  for (const endpoint of DEFAULT_ENDPOINTS) {
    await prisma.endpoint.upsert({
      where: { slug: endpoint.slug },
      update: {
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        permissionId: permissionBySlug.get(endpoint.permissionSlug) ?? null,
        isActive: true,
      },
      create: {
        slug: endpoint.slug,
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        permissionId: permissionBySlug.get(endpoint.permissionSlug) ?? null,
        isActive: true,
      },
    });
  }
}

async function seedAdminRolePermissions(permissionIds: string[]) {
  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } });
  if (!adminRole) return;

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({
      roleId: adminRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });
}

export async function seedAccessControl() {
  const permissionIds = await seedPermissions();
  await seedMenus();
  await seedEndpoints();
  await seedAdminRolePermissions(permissionIds);
}
