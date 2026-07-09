export function menuPathMatches(
  pathname: string,
  href: string,
  exactMatchRoots: string[] = [],
) {
  if (exactMatchRoots.includes(href)) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function resolveActiveMenuPath(
  pathname: string,
  paths: string[],
  exactMatchRoots: string[] = [],
): string | null {
  const matches = paths.filter((path) => menuPathMatches(pathname, path, exactMatchRoots));
  if (!matches.length) {
    return null;
  }

  return matches.sort((left, right) => right.length - left.length)[0] ?? null;
}
