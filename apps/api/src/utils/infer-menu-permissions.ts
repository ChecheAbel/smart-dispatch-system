const ADMIN_MODULES = [
  "users",
  "user_registrations",
  "roles",
  "menus",
  "notifications",
  "audit_logs",
  "vehicle_types",
  "maintenance_work_types",
  "vehicle_classes",
  "vehicles",
  "regions",
  "locations",
  "fare_plans",
  "contracts",
  "invoices",
  "ride_requests",
] as const;

type AdminModule = (typeof ADMIN_MODULES)[number];

function isAdminModule(value: string): value is AdminModule {
  return ADMIN_MODULES.includes(value as AdminModule);
}

export function inferMenuPermissionSlugs(slug: string, path?: string | null) {
  const normalizedSlug = slug.trim().toLowerCase();
  const normalizedPath = path?.trim() || null;

  if (normalizedSlug === "dashboard" || normalizedPath === "/admin") {
    return ADMIN_MODULES.map((module) => `${module}.read`);
  }

  if (normalizedSlug === "access-control") {
    return ["roles.read", "menus.read", "audit_logs.read"];
  }

  if (normalizedSlug === "audit-logs") {
    return ["audit_logs.read"];
  }

  if (normalizedSlug === "user-registrations") {
    return ["user_registrations.read"];
  }

  if (normalizedSlug === "account-management") {
    return ["users.read", "user_registrations.read"];
  }

  if (
    normalizedSlug === "system-settings" ||
    normalizedSlug === "notifications" ||
    normalizedSlug === "notification-templates" ||
    normalizedSlug === "notification-logs"
  ) {
    return ["notifications.read", "system_settings.read"];
  }

  if (normalizedSlug === "deadline-settings" || normalizedSlug === "branding-settings") {
    return ["system_settings.read"];
  }

  if (
    normalizedPath === "/admin/system-settings/deadline" ||
    normalizedPath === "/admin/system-settings/branding"
  ) {
    return ["system_settings.read"];
  }

  if (normalizedSlug === "fleet") {
    return ["vehicle_types.read", "vehicle_classes.read", "maintenance_work_types.read", "vehicles.read"];
  }

  if (normalizedSlug === "vehicle-types") {
    return ["vehicle_types.read"];
  }

  if (normalizedSlug === "vehicle-classes") {
    return ["vehicle_classes.read"];
  }

  if (normalizedSlug === "maintenance-work-types") {
    return ["maintenance_work_types.read"];
  }

  if (normalizedSlug === "fleet-vehicles") {
    return ["vehicles.read"];
  }

  if (normalizedSlug === "compliance") {
    return ["compliance.read", "vehicles.read"];
  }

  if (
    normalizedSlug === "compliance-overview" ||
    normalizedSlug === "compliance-insurance" ||
    normalizedSlug === "compliance-inspection"
  ) {
    return ["compliance.read", "vehicles.read"];
  }

  if (normalizedSlug === "location-management") {
    return ["regions.read", "locations.read"];
  }

  if (normalizedSlug === "location-regions") {
    return ["regions.read"];
  }

  if (normalizedSlug === "location-sites") {
    return ["locations.read"];
  }

  if (normalizedSlug === "billing") {
    return ["fare_plans.read", "contracts.read", "invoices.read"];
  }

  if (normalizedSlug === "fare-plans") {
    return ["fare_plans.read"];
  }

  if (normalizedSlug === "contracts") {
    return ["contracts.read"];
  }

  if (normalizedSlug === "invoices") {
    return ["invoices.read"];
  }

  if (normalizedSlug === "dispatch") {
    return ["ride_requests.read"];
  }

  if (normalizedSlug === "ride-requests") {
    return ["ride_requests.read"];
  }

  if (normalizedSlug === "customer-dashboard") {
    return ["customer_dashboard.read"];
  }

  if (normalizedSlug === "customer-profile") {
    return ["customer_profile.read"];
  }

  if (normalizedSlug === "customer-request-history") {
    return ["customer_requests.read"];
  }

  if (normalizedSlug === "customer-contracts") {
    return ["customer_contracts.read"];
  }

  if (normalizedSlug === "customer-invoices") {
    return ["customer_invoices.read"];
  }

  if (normalizedPath === "/dashboard") {
    return ["customer_dashboard.read"];
  }

  if (normalizedPath?.startsWith("/dashboard/profile")) {
    return ["customer_profile.read"];
  }

  if (normalizedPath?.startsWith("/book")) {
    return ["customer_requests.read"];
  }

  if (normalizedPath?.startsWith("/dashboard/my-requests")) {
    return ["customer_requests.read"];
  }

  if (normalizedPath?.startsWith("/dashboard/my-contracts")) {
    return ["customer_contracts.read"];
  }

  if (normalizedPath?.startsWith("/dashboard/my-invoices")) {
    return ["customer_invoices.read"];
  }

  if (isAdminModule(normalizedSlug)) {
    return [`${normalizedSlug}.read`];
  }

  const pathModule = normalizedPath?.match(/^\/admin\/([^/]+)/)?.[1];
  if (pathModule && isAdminModule(pathModule)) {
    return [`${pathModule}.read`];
  }

  return [];
}

export const MENU_PERMISSION_INFERENCE_ERROR =
  "Could not determine sidebar access from path or slug. Use paths like /admin/users or /dashboard/profile.";
