const ADMIN_MODULES = ["users", "roles", "menus"] as const;

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
    return ["roles.read", "menus.read"];
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
  "Could not determine sidebar access from path or slug. Use paths like /admin/users.";
