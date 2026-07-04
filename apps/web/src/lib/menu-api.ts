import type { Menu, MenuTranslation } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse, unwrapPaginatedApiResponse } from "./api-response";

export type FetchMenusParams = {
  page?: number;
  limit?: number;
  search?: string;
  locale?: string;
  is_active?: boolean;
};

export type CreateMenuInput = {
  slug: string;
  translations: MenuTranslation[];
  path?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  permission_id?: string | null;
  is_active?: boolean;
};

export type UpdateMenuInput = {
  slug?: string;
  translations?: MenuTranslation[];
  path?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  permission_id?: string | null;
  is_active?: boolean;
};

export async function fetchNavigationMenus(locale?: string) {
  const { data } = await apiClient.get("/api/menus/navigation", {
    params: locale ? { locale } : undefined,
  });

  return unwrapApiResponse<{ menus: Menu[] }>(data).menus;
}

export async function fetchMenus(params: FetchMenusParams = {}) {
  const { data } = await apiClient.get("/api/menus", { params });
  return unwrapPaginatedApiResponse<Menu>(data);
}

export async function fetchMenuById(id: string, locale?: string) {
  const { data } = await apiClient.get(`/api/menus/${id}`, {
    params: locale ? { locale } : undefined,
  });
  return unwrapApiResponse<{ menu: Menu }>(data).menu;
}

export async function createMenu(input: CreateMenuInput) {
  const { data } = await apiClient.post("/api/menus", input);
  return unwrapApiResponse<{ menu: Menu }>(data).menu;
}

export async function updateMenu(id: string, input: UpdateMenuInput) {
  const { data } = await apiClient.patch(`/api/menus/${id}`, input);
  return unwrapApiResponse<{ menu: Menu }>(data).menu;
}

export async function deleteMenu(id: string) {
  const { data } = await apiClient.delete(`/api/menus/${id}`);
  return unwrapApiResponse<{ message: string }>(data);
}

export async function fetchMenuCount(locale?: string) {
  const result = await fetchMenus({ page: 1, limit: 1, locale });
  return result.pagination.total;
}
