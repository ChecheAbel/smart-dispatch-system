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

export type NotificationDeliveryStatus = "sent" | "skipped" | "failed";

export interface NotificationDeliveryLog {
  id: string;
  status: NotificationDeliveryStatus;
  module: NotificationModule;
  event: string;
  channel: NotificationChannel;
  recipient: NotificationTemplateRecipient;
  template_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  recipient_contact: string | null;
  subject: string | null;
  body_preview: string | null;
  error_message: string | null;
  is_test: boolean;
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

export type NotificationModule =
  | "ride_requests"
  | "user_registrations"
  | "insurance"
  | "inspection"
  | "invoices"
  | "password_reset";

export type RideRequestNotificationEvent =
  | "created"
  | "confirmed"
  | "rejected"
  | "assigned"
  | "started"
  | "completed"
  | "cancelled";

export type UserRegistrationNotificationEvent = "submitted" | "approved" | "rejected";

export type ComplianceNotificationEvent = "due_soon" | "expired";

export type InvoiceNotificationEvent = "generated" | "due_soon" | "overdue";

export type PasswordResetNotificationEvent = "email_requested" | "sms_requested";

export type NotificationTemplateRecipient =
  | "requester"
  | "driver"
  | "applicant"
  | "fleet_manager"
  | "account_holder";

export interface NotificationTemplate {
  id: string;
  module: NotificationModule;
  event: string;
  channel: NotificationChannel;
  recipient: NotificationTemplateRecipient;
  is_enabled: boolean;
  subject: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export const RIDE_REQUEST_NOTIFICATION_PLACEHOLDERS = [
  "requester_name",
  "driver_name",
  "pickup",
  "dropoff",
  "scheduled_at",
  "passengers",
  "vehicle_plate",
  "rejection_reason",
  "status",
  "reference",
  "cancel_deadline_minutes",
  "cancel_deadline_at",
] as const;

export const USER_REGISTRATION_NOTIFICATION_PLACEHOLDERS = [
  "applicant_name",
  "applicant_email",
  "applicant_mobile",
  "segment",
  "organization_name",
  "rejection_reason",
  "reference",
] as const;

export const INSURANCE_NOTIFICATION_PLACEHOLDERS = [
  "vehicle_plate",
  "vehicle_type",
  "vehicle_class",
  "assigned_driver_name",
  "insurance_provider",
  "insurance_policy_number",
  "insurance_expires_at",
  "days_until_expiry",
  "days_overdue",
  "reference",
] as const;

export const INSPECTION_NOTIFICATION_PLACEHOLDERS = [
  "vehicle_plate",
  "vehicle_type",
  "vehicle_class",
  "assigned_driver_name",
  "inspection_center",
  "inspection_certificate_number",
  "inspection_performed_at",
  "inspection_expires_at",
  "days_until_expiry",
  "days_overdue",
  "reference",
] as const;

export const INVOICE_NOTIFICATION_PLACEHOLDERS = [
  "invoice_reference",
  "contract_reference",
  "contract_title",
  "customer_name",
  "organization_name",
  "billing_contact_name",
  "period_start",
  "period_end",
  "total_amount",
  "currency",
  "due_at",
  "days_until_due",
  "days_overdue",
  "payment_terms_days",
  "reference",
] as const;

export const PASSWORD_RESET_NOTIFICATION_PLACEHOLDERS = [
  "user_name",
  "user_email",
  "user_mobile",
  "reset_link",
  "reset_code",
  "expires_minutes",
  "reference",
] as const;

export type RideRequestNotificationPlaceholder =
  (typeof RIDE_REQUEST_NOTIFICATION_PLACEHOLDERS)[number];

export type UserRegistrationNotificationPlaceholder =
  (typeof USER_REGISTRATION_NOTIFICATION_PLACEHOLDERS)[number];

export type InsuranceNotificationPlaceholder =
  (typeof INSURANCE_NOTIFICATION_PLACEHOLDERS)[number];

export type InspectionNotificationPlaceholder =
  (typeof INSPECTION_NOTIFICATION_PLACEHOLDERS)[number];

export type InvoiceNotificationPlaceholder =
  (typeof INVOICE_NOTIFICATION_PLACEHOLDERS)[number];

export type PasswordResetNotificationPlaceholder =
  (typeof PASSWORD_RESET_NOTIFICATION_PLACEHOLDERS)[number];

export const NOTIFICATION_TEMPLATE_PLACEHOLDERS: Record<
  NotificationModule,
  readonly string[]
> = {
  ride_requests: RIDE_REQUEST_NOTIFICATION_PLACEHOLDERS,
  user_registrations: USER_REGISTRATION_NOTIFICATION_PLACEHOLDERS,
  insurance: INSURANCE_NOTIFICATION_PLACEHOLDERS,
  inspection: INSPECTION_NOTIFICATION_PLACEHOLDERS,
  invoices: INVOICE_NOTIFICATION_PLACEHOLDERS,
  password_reset: PASSWORD_RESET_NOTIFICATION_PLACEHOLDERS,
};

/** @deprecated Use NotificationTemplate */
export type RideRequestNotificationEventLegacy = RideRequestNotificationEvent;

/** @deprecated Use NotificationTemplateRecipient */
export type NotificationRecipient = "requester" | "driver";

/** @deprecated Use NotificationTemplate */
export type RideRequestNotificationRule = NotificationTemplate;

export interface PermissionEndpoint {
  method: string;
  path: string;
  description: string | null;
}

export interface Permission {
  id: string;
  slug: string;
  module: string;
  action: string;
  description: string | null;
  created_at: string;
  endpoints?: PermissionEndpoint[];
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

/** Slug alias for a maintenance work type (dynamic lookup). */
export type VehicleMaintenanceType = string;

export type VehicleMaintenanceStatus = "open" | "in_progress" | "completed" | "cancelled";

export interface MaintenanceWorkTypeTranslation {
  locale: string;
  name: string;
  description: string | null;
}

export interface MaintenanceWorkType {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locale: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  translations?: MaintenanceWorkTypeTranslation[];
}

export interface MaintenanceWorkTypeSummary {
  id: string;
  slug: string;
  name: string;
}

export type VehicleHistoryEventType =
  | "created"
  | "status_changed"
  | "driver_assigned"
  | "driver_unassigned"
  | "maintenance_opened"
  | "maintenance_updated"
  | "maintenance_completed"
  | "maintenance_cancelled"
  | "fuel_logged"
  | "fuel_updated"
  | "expiry_updated";

export type VehicleComplianceStatus = "expired" | "due_soon" | "ok" | "not_set";

export type VehicleComplianceType = "insurance" | "inspection";

export type VehicleComplianceSummary = {
  total_vehicles: number;
  vehicles_needing_attention: number;
} & Record<VehicleComplianceType, Record<VehicleComplianceStatus, number>>;

export interface Vehicle {
  id: string;
  plate_number: string;
  chassis_number: string | null;
  vehicle_type_id: string;
  vehicle_type?: {
    id: string;
    slug: string;
    name: string;
    passenger_capacity: number | null;
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
  images: string[];
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  insurance_issued_at: string | null;
  insurance_expires_at: string | null;
  insurance_notes: string | null;
  inspection_center: string | null;
  inspection_certificate_number: string | null;
  inspection_performed_at: string | null;
  inspection_expires_at: string | null;
  inspection_notes: string | null;
  registration_expires_at: string | null;
  open_maintenance_count?: number;
  /** Operational availability for booking: active fleet status and not on a confirmed/in-progress ride. */
  is_available_now?: boolean;
  /** ISO datetime when a busy vehicle is expected to become bookable again (from active ride end/return). */
  available_from?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleLocationSnapshot {
  vehicle_id: string;
  driver_user_id: string | null;
  latitude: number;
  longitude: number;
  heading: number | null;
  speed_kmh: number | null;
  accuracy_m: number | null;
  recorded_at: string;
  updated_at: string;
}

export const REALTIME_NAMESPACE = "/api/ws";

export const RealtimeEvents = {
  SessionReady: "session.ready",
  SessionPing: "session.ping",
  SessionPong: "session.pong",
  SessionError: "session.error",
  LocationPublish: "location.publish",
  LocationChanged: "location.changed",
  LocationSnapshot: "location.snapshot",
  LocationSubscribe: "location.subscribe",
  LocationUnsubscribe: "location.unsubscribe",
  LocationSubscribed: "location.subscribed",
  LocationUnsubscribed: "location.unsubscribed",
  TripsRefresh: "trips.refresh",
  TripsSnapshot: "trips.snapshot",
  TripsAdded: "trips.added",
  TripsUpdated: "trips.updated",
  TripsRemoved: "trips.removed",
} as const;

export type RealtimeEntityType = "vehicle";

export interface RealtimeEntityRef {
  entity_type: RealtimeEntityType;
  entity_id: string;
}

export interface RealtimeSessionReady {
  user_id: string;
  assigned_entity: RealtimeEntityRef | null;
  capabilities: {
    location_publish: boolean;
    location_subscribe: boolean;
    trips: boolean;
  };
}

export interface RealtimeLocationPublishInput {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed_kmh?: number | null;
  accuracy_m?: number | null;
  recorded_at?: string;
}

export interface VehicleMaintenanceLog {
  id: string;
  vehicle_id: string;
  work_type_id: string;
  work_type: MaintenanceWorkTypeSummary;
  /** Slug alias of `work_type` for backward compatibility. */
  type: string;
  status: VehicleMaintenanceStatus;
  title: string;
  description: string | null;
  vendor: string | null;
  cost_amount: number | null;
  odometer_km: number | null;
  started_at: string | null;
  completed_at: string | null;
  next_due_at: string | null;
  next_due_km: number | null;
  created_by_user_id: string | null;
  created_by: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export type VehicleFuelType = "diesel" | "petrol" | "other";

export type VehicleFuelLogSource = "manual" | "driver_app" | "import";

export interface VehicleFuelLog {
  id: string;
  vehicle_id: string;
  logged_at: string;
  odometer_km: number;
  quantity_liters: number;
  total_cost: number | null;
  price_per_liter: number | null;
  fuel_type: VehicleFuelType;
  station_name: string | null;
  receipt_reference: string | null;
  source: VehicleFuelLogSource;
  notes: string | null;
  distance_since_last_km: number | null;
  consumption_km_per_liter: number | null;
  created_by_user_id: string | null;
  created_by: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleHistoryEvent {
  id: string;
  vehicle_id: string;
  event_type: VehicleHistoryEventType;
  summary: string;
  metadata: Record<string, unknown>;
  actor_user_id: string | null;
  actor: {
    id: string;
    name: string;
  } | null;
  created_at: string;
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

export type AdminDashboardDailyCount = {
  date: string;
  count: number;
};

export type AdminDashboardFuelDaily = {
  date: string;
  total_cost: number;
  total_liters: number;
};

export type AdminDashboardPaymentDaily = {
  date: string;
  paid_amount: number;
  issued_amount: number;
};

export type AdminDashboardCompliancePoint = {
  status: VehicleComplianceStatus;
  count: number;
};

export type AdminDashboardAnalytics = {
  period_days: number;
  ride_requests: {
    by_status: Record<RideRequestStatus, number>;
    trend: AdminDashboardDailyCount[];
    by_region: Array<{
      region_id: string | null;
      region_name: string;
      count: number;
    }>;
  } | null;
  fleet: {
    by_status: Record<VehicleStatus, number>;
    compliance: {
      insurance: AdminDashboardCompliancePoint[];
      inspection: AdminDashboardCompliancePoint[];
      vehicles_needing_attention: number;
    } | null;
  } | null;
  fuel: {
    trend: AdminDashboardFuelDaily[];
  } | null;
  payments: {
    by_status: Record<InvoiceStatus, number>;
    trend: AdminDashboardPaymentDaily[];
    paid_total: number;
    outstanding_total: number;
  } | null;
  registrations: {
    trend: AdminDashboardDailyCount[];
  } | null;
};

export interface RideRequestLocalizedName {
  locale: string;
  name: string;
  description?: string | null;
}

export interface RideRequest {
  id: string;
  requester_user_id: string;
  requester?: RideRequestRequesterSummary | null;
  vehicle_type_id: string | null;
  vehicle_type?: {
    id: string;
    slug: string;
    name: string;
    translations?: RideRequestLocalizedName[];
  } | null;
  vehicle_class_id: string | null;
  vehicle_class?: {
    id: string;
    slug: string;
    name: string;
    translations?: RideRequestLocalizedName[];
  } | null;
  region_id: string | null;
  region?: {
    id: string;
    slug: string;
    name: string;
    translations?: RideRequestLocalizedName[];
  } | null;
  pickup_location_id: string | null;
  pickup_location?: {
    id: string;
    name: string;
    translations?: RideRequestLocalizedName[];
  } | null;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_location_id: string | null;
  dropoff_location?: {
    id: string;
    name: string;
    translations?: RideRequestLocalizedName[];
  } | null;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  scheduled_at: string | null;
  scheduled_return_at: string | null;
  passenger_count: number;
  notes: string | null;
  status: RideRequestStatus;
  rejection_reason: string | null;
  contract_id: string | null;
  contract?: RideRequestContractSummary | null;
  assigned_vehicle_id: string | null;
  assigned_vehicle?: {
    id: string;
    plate_number: string;
    make: string | null;
    model: string | null;
    vehicle_type?: {
      id: string;
      slug: string;
      name: string;
      translations?: RideRequestLocalizedName[];
    } | null;
    vehicle_class?: {
      id: string;
      slug: string;
      name: string;
      translations?: RideRequestLocalizedName[];
    } | null;
  } | null;
  assigned_driver_user_id: string | null;
  assigned_driver?: {
    id: string;
    name: string;
    email: string;
    mobile_number: string;
  } | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  driver_rating: RideRequestDriverRating | null;
  can_rate_driver: boolean;
  can_edit: boolean;
  can_cancel: boolean;
  cancel_deadline_at: string | null;
  edit_deadline_at: string | null;
}

export interface RideRequestDriverRating {
  id: string;
  rating: number;
  comment: string | null;
  driver_user_id: string;
  created_at: string;
}

export interface RideRequestRequesterSummary {
  id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;
  mobile_number: string;
  requester_profile: {
    segment: RequesterSegment;
    organization_name: string | null;
    government_entity_type: string | null;
  } | null;
}

export type ContractStatus = "draft" | "active" | "expired" | "cancelled";

export type ContractBillingInterval = "per_trip" | "monthly" | "quarterly" | "annually";

export interface ContractFarePlanSummary {
  id: string;
  slug: string;
  name: string;
  pricing_model: PricingModel;
  currency: string;
  base_fare: number;
  is_active: boolean;
}

export interface Contract {
  id: string;
  reference_number: string;
  title: string;
  status: ContractStatus;
  fare_plan_id: string | null;
  fare_plan: ContractFarePlanSummary | null;
  notes: string | null;
  billing_interval: ContractBillingInterval;
  payment_terms_days: number | null;
  region_ids: string[];
  vehicle_type_ids: string[];
  vehicle_class_ids: string[];
  created_by_user_id: string | null;
  created_by: {
    id: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface RideRequestContractSummary {
  id: string;
  reference_number: string;
  title: string;
  status: ContractStatus;
  billing_interval: ContractBillingInterval;
}

export interface ContractEnrollment {
  id: string;
  contract_id: string;
  requester_user_id: string;
  requester: {
    id: string;
    name: string;
    email: string;
    mobile_number: string;
  };
  starts_at: string;
  ends_at: string;
  created_at: string;
}

export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export interface InvoiceContractSummary {
  id: string;
  reference_number: string;
  title: string;
  billing_interval: ContractBillingInterval;
  payment_terms_days: number | null;
}

export interface InvoiceEnrollmentSummary {
  id: string;
  starts_at: string;
  ends_at: string;
}

export interface InvoiceRequesterSummary {
  id: string;
  name: string;
  email: string;
  mobile_number: string;
  organization_name: string | null;
  billing_contact_name: string | null;
  billing_contact_email: string | null;
}

export interface InvoiceLineItemFarePlanSummary {
  id: string;
  slug: string;
  name: string;
  pricing_model: PricingModel;
}

export interface InvoiceLineItemRideVehicleSummary {
  plate_number: string;
  make: string | null;
  model: string | null;
}

export interface InvoiceLineItemRideDriverSummary {
  name: string;
}

export interface InvoiceLineItemRideSummary {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  scheduled_at: string | null;
  scheduled_return_at: string | null;
  passenger_count: number;
  started_at: string | null;
  completed_at: string | null;
  status: RideRequestStatus;
  assigned_driver: InvoiceLineItemRideDriverSummary | null;
  assigned_vehicle: InvoiceLineItemRideVehicleSummary | null;
}

export interface InvoiceLineItem {
  id: string;
  ride_request_id: string;
  description: string;
  quantity: number;
  unit_amount: number;
  line_total: number;
  fare_plan_id: string | null;
  fare_plan: InvoiceLineItemFarePlanSummary | null;
  distance_km: number | null;
  duration_minutes: number | null;
  pricing_snapshot: Record<string, unknown> | null;
  ride_request: InvoiceLineItemRideSummary;
  created_at: string;
}

export interface Invoice {
  id: string;
  reference_number: string;
  status: InvoiceStatus;
  contract_id: string;
  contract: InvoiceContractSummary;
  contract_enrollment_id: string | null;
  contract_enrollment: InvoiceEnrollmentSummary | null;
  requester_user_id: string;
  requester: InvoiceRequesterSummary;
  period_start: string;
  period_end: string;
  subtotal: number;
  total_amount: number;
  currency: string;
  payment_terms_days: number | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  notes: string | null;
  line_items: InvoiceLineItem[];
  line_item_count: number;
  created_at: string;
  updated_at: string;
}

export type CustomerVisibleInvoiceStatus = Exclude<InvoiceStatus, "draft">;

export interface CustomerInvoiceSummary {
  id: string;
  reference_number: string;
  status: CustomerVisibleInvoiceStatus;
  total_amount: number;
  currency: string;
  due_at: string | null;
  paid_at: string | null;
  issued_at: string | null;
}

export interface CustomerContractEnrollment {
  id: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  contract: RideRequestContractSummary & {
    payment_terms_days: number | null;
  };
  invoice: CustomerInvoiceSummary | null;
}

export interface CustomerInvoice {
  id: string;
  reference_number: string;
  status: CustomerVisibleInvoiceStatus;
  contract: InvoiceContractSummary;
  contract_enrollment: InvoiceEnrollmentSummary | null;
  period_start: string;
  period_end: string;
  subtotal: number;
  total_amount: number;
  currency: string;
  payment_terms_days: number | null;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  notes: string | null;
  line_items: InvoiceLineItem[];
  line_item_count: number;
  created_at: string;
}

export interface RideRequestContractOption extends RideRequestContractSummary {
  billing_interval: ContractBillingInterval;
  current_enrollment: {
    starts_at: string;
    ends_at: string;
  } | null;
  region_ids: string[];
  vehicle_type_ids: string[];
  vehicle_class_ids: string[];
}

export interface AdminRideRequest extends RideRequest {
  requester?: RideRequestRequesterSummary;
  can_admin_confirm: boolean;
  can_admin_reject: boolean;
  can_admin_assign: boolean;
  can_admin_unassign: boolean;
  can_admin_start: boolean;
  start_blocked_by_schedule: boolean;
  can_admin_complete: boolean;
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
