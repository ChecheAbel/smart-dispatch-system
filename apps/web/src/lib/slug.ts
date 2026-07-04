/** Converts readable text into a URL-safe hyphenated slug. */
export function generateSlugFromText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Builds permission slugs like `users.read`. */
export function generatePermissionSlug(module: string, action: string) {
  const normalizedModule = module.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const normalizedAction = action.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

  if (!normalizedModule || !normalizedAction) {
    return "";
  }

  return `${normalizedModule}.${normalizedAction}`;
}

/** Builds endpoint slugs from HTTP method and path, e.g. `get-roles-id`. */
export function generateEndpointSlug(method: string, path: string) {
  const normalizedPath = path
    .trim()
    .replace(/^\/api\/?/i, "")
    .replace(/:/g, "")
    .replace(/\//g, "-");

  return generateSlugFromText(`${method}-${normalizedPath}`);
}
