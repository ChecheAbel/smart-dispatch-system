import type { HttpMethod } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { setMenuPermissions } from "../models/menu-permission.model";
import { setRolePermissions } from "../models/role-permission.model";
import { inferMenuPermissionSlugs } from "../utils/infer-menu-permissions";
import { menuTranslationInputsToMap } from "../types/menu-translations";
import type { Prisma } from "../generated/prisma";

const DEFAULT_PERMISSIONS = [
  { slug: "users.read", module: "users", action: "read", description: "View users" },
  { slug: "users.write", module: "users", action: "write", description: "Create and update users" },
  { slug: "users.delete", module: "users", action: "delete", description: "Delete users" },
  { slug: "roles.read", module: "roles", action: "read", description: "View roles" },
  { slug: "roles.write", module: "roles", action: "write", description: "Create and update roles" },
  { slug: "roles.delete", module: "roles", action: "delete", description: "Delete roles" },
  { slug: "menus.read", module: "menus", action: "read", description: "View menus" },
  { slug: "menus.write", module: "menus", action: "write", description: "Create and update menus" },
  { slug: "menus.delete", module: "menus", action: "delete", description: "Delete menus" },
] as const;

const REMOVED_MENU_SLUGS = ["permissions", "endpoints"] as const;

const REMOVED_PERMISSION_SLUGS = [
  "permissions.read",
  "permissions.write",
  "permissions.delete",
  "endpoints.read",
  "endpoints.write",
  "endpoints.delete",
] as const;

const REMOVED_ENDPOINT_SLUGS = [
  "permissions.create",
  "permissions.update",
  "permissions.delete",
  "endpoints.list",
  "endpoints.create",
  "endpoints.update",
  "endpoints.delete",
] as const;

const DEFAULT_MENUS = [
  {
    slug: "dashboard",
    path: "/admin",
    icon: "layout-dashboard",
    sortOrder: 0,
    parentSlug: null,
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
    parentSlug: null,
    translations: [
      { locale: "en", label: "Users" },
      { locale: "am", label: "ተጠቃሚዎች" },
    ],
  },
  {
    slug: "access-control",
    path: null,
    icon: "shield-check",
    sortOrder: 20,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Access Control" },
      { locale: "am", label: "የመዳረሻ ቁጥጥር" },
    ],
  },
  {
    slug: "roles",
    path: "/admin/roles",
    icon: "shield",
    sortOrder: 10,
    parentSlug: "access-control",
    translations: [
      { locale: "en", label: "Roles" },
      { locale: "am", label: "ሚናዎች" },
    ],
  },
  {
    slug: "menus",
    path: "/admin/menus",
    icon: "menu",
    sortOrder: 30,
    parentSlug: "access-control",
    translations: [
      { locale: "en", label: "Menus" },
      { locale: "am", label: "ሜኑዎች" },
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
  { slug: "roles.create", method: "POST", path: "/api/roles", description: "Create role", permissionSlug: "roles.write" },
  { slug: "roles.update", method: "PATCH", path: "/api/roles/:id", description: "Update role", permissionSlug: "roles.write" },
  { slug: "roles.delete", method: "DELETE", path: "/api/roles/:id", description: "Delete role", permissionSlug: "roles.delete" },
  { slug: "permissions.list", method: "GET", path: "/api/permissions", description: "List permissions", permissionSlug: "menus.read" },
  { slug: "menus.list", method: "GET", path: "/api/menus", description: "List menus", permissionSlug: "menus.read" },
  { slug: "menus.create", method: "POST", path: "/api/menus", description: "Create menu", permissionSlug: "menus.write" },
  { slug: "menus.update", method: "PATCH", path: "/api/menus/:id", description: "Update menu", permissionSlug: "menus.write" },
  { slug: "menus.delete", method: "DELETE", path: "/api/menus/:id", description: "Delete menu", permissionSlug: "menus.delete" },
  { slug: "menus.navigation", method: "GET", path: "/api/menus/navigation", description: "Navigation menu for current user", permissionSlug: "menus.read" },
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
  const menuIdBySlug = new Map<string, string>();

  const parentMenus = DEFAULT_MENUS.filter((menu) => !menu.parentSlug);
  const childMenus = DEFAULT_MENUS.filter((menu) => menu.parentSlug);

  for (const menu of [...parentMenus, ...childMenus]) {
    const translations = menuTranslationInputsToMap(
      menu.translations.map((translation) => ({ ...translation })),
    ) as Prisma.InputJsonValue;

    const parentId = menu.parentSlug ? menuIdBySlug.get(menu.parentSlug) ?? null : null;

    const record = await prisma.menu.upsert({
      where: { slug: menu.slug },
      update: {
        path: menu.path,
        icon: menu.icon,
        parentId,
        sortOrder: menu.sortOrder,
        translations,
        isActive: true,
      },
      create: {
        slug: menu.slug,
        path: menu.path,
        icon: menu.icon,
        parentId,
        sortOrder: menu.sortOrder,
        translations,
        isActive: true,
      },
    });

    const menuPermissionIds = inferMenuPermissionSlugs(menu.slug, menu.path)
      .map((slug) => permissionBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    await setMenuPermissions(record.id, menuPermissionIds);

    menuIdBySlug.set(menu.slug, record.id);
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

async function deleteRemovedMenus() {
  await prisma.menu.deleteMany({
    where: { slug: { in: [...REMOVED_MENU_SLUGS] } },
  });
}

async function deleteRemovedPermissions() {
  await prisma.permission.deleteMany({
    where: { slug: { in: [...REMOVED_PERMISSION_SLUGS] } },
  });
}

async function deleteRemovedEndpoints() {
  await prisma.endpoint.deleteMany({
    where: { slug: { in: [...REMOVED_ENDPOINT_SLUGS] } },
  });
}

async function seedAdminRolePermissions(permissionIds: string[]) {
  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } });
  if (!adminRole) return;

  await setRolePermissions(adminRole.id, permissionIds);
  console.log(`[Seed] Administrator role synced with ${permissionIds.length} permissions`);
}

/** Re-assigns every default platform permission to the admin role. */
export async function restoreAdminRolePermissions() {
  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } });
  if (!adminRole) {
    throw new Error('Role with slug "admin" was not found. Run pnpm db:seed first.');
  }

  const permissions = await prisma.permission.findMany({
    where: {
      slug: { in: DEFAULT_PERMISSIONS.map((permission) => permission.slug) },
    },
    orderBy: { slug: "asc" },
  });

  await setRolePermissions(
    adminRole.id,
    permissions.map((permission) => permission.id),
  );

  return permissions.length;
}

export async function seedAccessControl() {
  const permissionIds = await seedPermissions();
  await seedMenus();
  await deleteRemovedMenus();
  await seedEndpoints();
  await deleteRemovedEndpoints();
  await deleteRemovedPermissions();
  await seedAdminRolePermissions(permissionIds);
}
