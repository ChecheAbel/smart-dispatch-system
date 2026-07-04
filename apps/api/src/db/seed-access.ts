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
  { slug: "notifications.read", module: "notifications", action: "read", description: "View notification settings" },
  { slug: "notifications.write", module: "notifications", action: "write", description: "Manage notification settings" },
  { slug: "notifications.delete", module: "notifications", action: "delete", description: "Delete notification resources" },
  { slug: "audit_logs.read", module: "audit_logs", action: "read", description: "View audit logs" },
  { slug: "vehicle_types.read", module: "vehicle_types", action: "read", description: "View vehicle types" },
  { slug: "vehicle_types.write", module: "vehicle_types", action: "write", description: "Create and update vehicle types" },
  { slug: "vehicle_types.delete", module: "vehicle_types", action: "delete", description: "Delete vehicle types" },
  { slug: "vehicles.read", module: "vehicles", action: "read", description: "View vehicles" },
  { slug: "vehicles.write", module: "vehicles", action: "write", description: "Create and update vehicles" },
  { slug: "vehicles.delete", module: "vehicles", action: "delete", description: "Delete vehicles" },
  { slug: "regions.read", module: "regions", action: "read", description: "View regions" },
  { slug: "regions.write", module: "regions", action: "write", description: "Create and update regions" },
  { slug: "regions.delete", module: "regions", action: "delete", description: "Delete regions" },
  { slug: "locations.read", module: "locations", action: "read", description: "View locations" },
  { slug: "locations.write", module: "locations", action: "write", description: "Create and update locations" },
  { slug: "locations.delete", module: "locations", action: "delete", description: "Delete locations" },
  { slug: "fare_plans.read", module: "fare_plans", action: "read", description: "View fare plans" },
  { slug: "fare_plans.write", module: "fare_plans", action: "write", description: "Create and update fare plans" },
  { slug: "fare_plans.delete", module: "fare_plans", action: "delete", description: "Delete fare plans" },
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
  {
    slug: "audit-logs",
    path: "/admin/audit-logs",
    icon: "scroll-text",
    sortOrder: 40,
    parentSlug: "access-control",
    translations: [
      { locale: "en", label: "Audit Logs" },
      { locale: "am", label: "የኦዲት መዝገቦች" },
    ],
  },
  {
    slug: "notifications",
    path: null,
    icon: "bell",
    sortOrder: 30,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Notifications" },
      { locale: "am", label: "ማሳወቂያዎች" },
    ],
  },
  {
    slug: "notifications-email",
    path: "/admin/notifications/email",
    icon: "mail",
    sortOrder: 10,
    parentSlug: "notifications",
    translations: [
      { locale: "en", label: "Email" },
      { locale: "am", label: "ኢሜይል" },
    ],
  },
  {
    slug: "notifications-sms",
    path: "/admin/notifications/sms",
    icon: "message-square",
    sortOrder: 20,
    parentSlug: "notifications",
    translations: [
      { locale: "en", label: "SMS" },
      { locale: "am", label: "ኤስኤምኤስ" },
    ],
  },
  {
    slug: "fleet",
    path: null,
    icon: "truck",
    sortOrder: 40,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Vehicle Management" },
      { locale: "am", label: "የተሽከርካሪ አስተዳደር" },
    ],
  },
  {
    slug: "vehicle-types",
    path: "/admin/fleet/vehicle-types",
    icon: "layers",
    sortOrder: 10,
    parentSlug: "fleet",
    translations: [
      { locale: "en", label: "Vehicle Types" },
      { locale: "am", label: "የተሽከርካሪ አይነቶች" },
    ],
  },
  {
    slug: "fleet-vehicles",
    path: "/admin/fleet/vehicles",
    icon: "truck",
    sortOrder: 20,
    parentSlug: "fleet",
    translations: [
      { locale: "en", label: "Vehicles" },
      { locale: "am", label: "ተሽከርካሪዎች" },
    ],
  },
  {
    slug: "location-management",
    path: null,
    icon: "map",
    sortOrder: 50,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Location Management" },
      { locale: "am", label: "የቦታ አስተዳደር" },
    ],
  },
  {
    slug: "location-regions",
    path: "/admin/locations/regions",
    icon: "map",
    sortOrder: 10,
    parentSlug: "location-management",
    translations: [
      { locale: "en", label: "Regions" },
      { locale: "am", label: "ክልሎች" },
    ],
  },
  {
    slug: "location-sites",
    path: "/admin/locations/sites",
    icon: "map-pin",
    sortOrder: 20,
    parentSlug: "location-management",
    translations: [
      { locale: "en", label: "Locations" },
      { locale: "am", label: "ቦታዎች" },
    ],
  },
  {
    slug: "billing",
    path: null,
    icon: "receipt",
    sortOrder: 60,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Billing" },
      { locale: "am", label: "ክፍያ" },
    ],
  },
  {
    slug: "fare-plans",
    path: "/admin/billing/fare-plans",
    icon: "coins",
    sortOrder: 10,
    parentSlug: "billing",
    translations: [
      { locale: "en", label: "Fare Plans" },
      { locale: "am", label: "የክፍያ ዕቅዶች" },
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
  { slug: "notifications.email.get", method: "GET", path: "/api/notifications/email", description: "Get email notification configuration", permissionSlug: "notifications.read" },
  { slug: "notifications.email.update", method: "PATCH", path: "/api/notifications/email", description: "Update email notification configuration", permissionSlug: "notifications.write" },
  { slug: "notifications.sms.get", method: "GET", path: "/api/notifications/sms", description: "Get SMS notification configuration", permissionSlug: "notifications.read" },
  { slug: "notifications.sms.update", method: "PATCH", path: "/api/notifications/sms", description: "Update SMS notification configuration", permissionSlug: "notifications.write" },
  { slug: "notifications.sms.test", method: "POST", path: "/api/notifications/sms/test", description: "Send test SMS", permissionSlug: "notifications.write" },
  { slug: "audit_logs.list", method: "GET", path: "/api/audit-logs", description: "List audit logs", permissionSlug: "audit_logs.read" },
  { slug: "audit_logs.get", method: "GET", path: "/api/audit-logs/:id", description: "Get audit log entry", permissionSlug: "audit_logs.read" },
  { slug: "vehicle_types.list", method: "GET", path: "/api/vehicle-types", description: "List vehicle types", permissionSlug: "vehicle_types.read" },
  { slug: "vehicle_types.active", method: "GET", path: "/api/vehicle-types/active", description: "List active vehicle types", permissionSlug: "vehicle_types.read" },
  { slug: "vehicle_types.create", method: "POST", path: "/api/vehicle-types", description: "Create vehicle type", permissionSlug: "vehicle_types.write" },
  { slug: "vehicle_types.update", method: "PATCH", path: "/api/vehicle-types/:id", description: "Update vehicle type", permissionSlug: "vehicle_types.write" },
  { slug: "vehicle_types.delete", method: "DELETE", path: "/api/vehicle-types/:id", description: "Delete vehicle type", permissionSlug: "vehicle_types.delete" },
  { slug: "vehicles.list", method: "GET", path: "/api/vehicles", description: "List vehicles", permissionSlug: "vehicles.read" },
  { slug: "vehicles.driver_options", method: "GET", path: "/api/vehicles/driver-options", description: "List assignable drivers", permissionSlug: "vehicles.read" },
  { slug: "vehicles.get", method: "GET", path: "/api/vehicles/:id", description: "Get vehicle", permissionSlug: "vehicles.read" },
  { slug: "vehicles.create", method: "POST", path: "/api/vehicles", description: "Create vehicle", permissionSlug: "vehicles.write" },
  { slug: "vehicles.update", method: "PATCH", path: "/api/vehicles/:id", description: "Update vehicle", permissionSlug: "vehicles.write" },
  { slug: "vehicles.delete", method: "DELETE", path: "/api/vehicles/:id", description: "Delete vehicle", permissionSlug: "vehicles.delete" },
  { slug: "regions.list", method: "GET", path: "/api/regions", description: "List regions", permissionSlug: "regions.read" },
  { slug: "regions.active", method: "GET", path: "/api/regions/active", description: "List active regions", permissionSlug: "regions.read" },
  { slug: "regions.create", method: "POST", path: "/api/regions", description: "Create region", permissionSlug: "regions.write" },
  { slug: "regions.update", method: "PATCH", path: "/api/regions/:id", description: "Update region", permissionSlug: "regions.write" },
  { slug: "regions.delete", method: "DELETE", path: "/api/regions/:id", description: "Delete region", permissionSlug: "regions.delete" },
  { slug: "locations.list", method: "GET", path: "/api/locations", description: "List locations", permissionSlug: "locations.read" },
  { slug: "locations.get", method: "GET", path: "/api/locations/:id", description: "Get location", permissionSlug: "locations.read" },
  { slug: "locations.create", method: "POST", path: "/api/locations", description: "Create location", permissionSlug: "locations.write" },
  { slug: "locations.update", method: "PATCH", path: "/api/locations/:id", description: "Update location", permissionSlug: "locations.write" },
  { slug: "locations.delete", method: "DELETE", path: "/api/locations/:id", description: "Delete location", permissionSlug: "locations.delete" },
  { slug: "fare_plans.list", method: "GET", path: "/api/fare-plans", description: "List fare plans", permissionSlug: "fare_plans.read" },
  { slug: "fare_plans.get", method: "GET", path: "/api/fare-plans/:id", description: "Get fare plan", permissionSlug: "fare_plans.read" },
  { slug: "fare_plans.create", method: "POST", path: "/api/fare-plans", description: "Create fare plan", permissionSlug: "fare_plans.write" },
  { slug: "fare_plans.update", method: "PATCH", path: "/api/fare-plans/:id", description: "Update fare plan", permissionSlug: "fare_plans.write" },
  { slug: "fare_plans.delete", method: "DELETE", path: "/api/fare-plans/:id", description: "Delete fare plan", permissionSlug: "fare_plans.delete" },
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
