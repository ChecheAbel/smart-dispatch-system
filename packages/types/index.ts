export type RoleSlug = "admin" | "dispatcher" | "driver";

export type AccountStatus = "active" | "suspended" | "deactivated";

export type AccountActivation = "pending" | "activated";

export interface RoleTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface Role {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  created_at: string;
  translations?: RoleTranslation[];
}

/** Public user returned by auth endpoints (no password). */
export interface User {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  mobile_number: string;
  account_status: AccountStatus;
  account_activation: AccountActivation;
  roles: RoleSlug[];
}

export interface AuthRole {
  user_id: string;
  role_id: string;
  assigned_at: string;
  user?: User;
  role?: Role;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Permission {
  id: string;
  slug: string;
  module: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface MenuTranslation {
  locale: string;
  label: string;
}

export interface Menu {
  id: string;
  slug: string;
  label: string;
  locale: string;
  path: string | null;
  icon: string | null;
  parent_id: string | null;
  sort_order: number;
  permission_id: string | null;
  is_active: boolean;
  created_at: string;
  translations?: MenuTranslation[];
  children?: Menu[];
}

export interface Endpoint {
  id: string;
  slug: string;
  method: HttpMethod;
  path: string;
  description: string | null;
  permission_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "Bearer";
  expires_in: number;
  user: User;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiPaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiPaginatedResponse<T>
  | ApiErrorResponse;
