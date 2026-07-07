const ADMIN_MODULES = [
  "users",
  "user_registrations",
  "roles",
  "menus",
  "notifications",
  "audit_logs",
  "vehicle_types",
  "vehicle_classes",
  "vehicles",
  "regions",
  "locations",
  "fare_plans",
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

  if (normalizedSlug === "system-settings" || normalizedSlug === "notifications") {
    return ["notifications.read"];
  }

  if (normalizedSlug === "fleet") {
    return ["vehicle_types.read", "vehicle_classes.read", "vehicles.read"];
  }

  if (normalizedSlug === "vehicle-types") {
    return ["vehicle_types.read"];
  }

  if (normalizedSlug === "vehicle-classes") {
    return ["vehicle_classes.read"];
  }

  if (normalizedSlug === "fleet-vehicles") {
    return ["vehicles.read"];
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
    return ["fare_plans.read"];
  }

  if (normalizedSlug === "fare-plans") {
    return ["fare_plans.read"];
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

  if (normalizedSlug === "customer-requests" || normalizedSlug === "customer-request-history") {
    return ["customer_requests.read"];
  }

  if (normalizedPath === "/dashboard") {
    return ["customer_dashboard.read"];
  }

  if (normalizedPath?.startsWith("/dashboard/profile")) {
    return ["customer_profile.read"];
  }

  if (normalizedPath?.startsWith("/dashboard/requests")) {
    return ["customer_requests.read"];
  }

  if (normalizedPath?.startsWith("/dashboard/my-requests")) {
    return ["customer_requests.read"];
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
