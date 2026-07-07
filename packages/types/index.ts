export type RoleSlug = "admin" | "dispatcher" | "driver" | "user";

export const ADMIN_ROLE_SLUG: RoleSlug = "admin";

export function isProtectedSystemRole(role: Pick<Role, "slug">) {
  return role.slug === ADMIN_ROLE_SLUG;
}

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

/** Driver-specific profile linked to a user account. */
export interface DriverProfile {
  license_number: string;
  license_photo_url: string | null;
}

export type RequesterSegment = "individual" | "business" | "government";

export interface RequesterProfile {
  segment: RequesterSegment;
  organization_name: string | null;
  job_title: string | null;
  organization_address: string | null;
  tax_id: string | null;
  registration_number: string | null;
  government_entity_type: string | null;
  official_reference: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
  created_at: string;
  updated_at: string;
}

/** Public user returned by auth endpoints (no password). */
export interface User {
  id: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  mobile_number: string;
  driver: DriverProfile | null;
  requester_profile: RequesterProfile | null;
  account_status: AccountStatus;
  account_activation: AccountActivation;
  account_block_reason: string | null;
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

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "assign"
  | "revoke"
  | "test";

export interface AuditLog {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: AuditAction;
  module: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  request_method: string | null;
  request_path: string | null;
  created_at: string;
}

export type NotificationChannel = "email" | "sms";

export interface NotificationConfiguration {
  id: string;
  channel: NotificationChannel;
  is_enabled: boolean;
  provider: string | null;
  from_email: string | null;
  from_name: string | null;
  reply_to: string | null;
  sender_id: string | null;
  settings: Record<string, unknown>;
  has_credentials: boolean;
  created_at: string;
  updated_at: string;
}

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
  permission_ids: string[];
  is_active: boolean;
  created_at: string;
  translations?: MenuTranslation[];
  children?: Menu[];
}

export interface VehicleTypeTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface VehicleType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  passenger_capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: VehicleTypeTranslation[];
  allowed_class_ids?: string[];
}

export interface VehicleClassTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface VehicleClass {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: VehicleClassTranslation[];
}

export type VehicleStatus = "active" | "maintenance" | "retired";

export interface Vehicle {
  id: string;
  plate_number: string;
  chassis_number: string | null;
  vehicle_type_id: string;
  vehicle_type?: {
    id: string;
    slug: string;
    name: string;
  };
  vehicle_class_id: string;
  vehicle_class?: {
    id: string;
    slug: string;
    name: string;
  };
  assigned_driver_user_id: string | null;
  assigned_driver: {
    id: string;
    name: string;
    email: string;
    mobile_number: string;
  } | null;
  make: string | null;
  model: string | null;
  year: number | null;
  status: VehicleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleDriverOption {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
}

export interface RegionTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface Region {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: RegionTranslation[];
}

export interface LocationTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface Location {
  id: string;
  region_id: string;
  region?: {
    id: string;
    slug: string;
    name: string;
  };
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  can_pickup: boolean;
  can_dropoff: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: LocationTranslation[];
}

export interface RideRequestLocationOption {
  id: string;
  region_id: string;
  region: {
    id: string;
    slug: string;
    name: string;
  };
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
}

export type PricingModel = "flat" | "distance" | "time" | "distance_time" | "hourly";

export interface FarePlanTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface FarePlan {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  vehicle_type_id: string | null;
  vehicle_class_id: string | null;
  vehicle_type?: {
    id: string;
    slug: string;
    name: string;
  };
  vehicle_class?: {
    id: string;
    slug: string;
    name: string;
  };
  region_id: string | null;
  region?: {
    id: string;
    slug: string;
    name: string;
  };
  pricing_model: PricingModel;
  currency: string;
  base_fare: number;
  per_km_rate: number | null;
  per_minute_rate: number | null;
  minimum_fare: number | null;
  booking_fee: number | null;
  free_waiting_minutes: number | null;
  waiting_fee_per_minute: number | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  translations?: FarePlanTranslation[];
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
  permissions: Permission[];
}

export interface AuthMeResponse {
  user: User;
  permissions: Permission[];
}

export type RideRequestStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface RideRequest {
  id: string;
  requester_user_id: string;
  vehicle_type_id: string | null;
  vehicle_type?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  vehicle_class_id: string | null;
  vehicle_class?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  region_id: string | null;
  region?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  pickup_location_id: string | null;
  pickup_location?: {
    id: string;
    name: string;
  } | null;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_location_id: string | null;
  dropoff_location?: {
    id: string;
    name: string;
  } | null;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  scheduled_at: string | null;
  passenger_count: number;
  notes: string | null;
  status: RideRequestStatus;
  created_at: string;
  updated_at: string;
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
  account_block_reason?: string | null;
}

export type ApiResponse<T> =
  | ApiSuccessResponse<T>
  | ApiPaginatedResponse<T>
  | ApiErrorResponse;
