import type { Menu } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export async function fetchNavigationMenus(locale?: string) {
  const { data } = await apiClient.get("/api/menus/navigation", {
    params: locale ? { locale } : undefined,
  });

  return unwrapApiResponse<{ menus: Menu[] }>(data).menus;
}
