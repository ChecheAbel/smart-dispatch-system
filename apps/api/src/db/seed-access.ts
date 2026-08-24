import type { HttpMethod } from "../generated/prisma";
import { prisma } from "../db/prisma";
import { ensureMenuPermissions } from "../models/menu-permission.model";
import { ensureRolePermissions, setRolePermissions } from "../models/role-permission.model";
import { inferMenuPermissionSlugs } from "../utils/infer-menu-permissions";
import { menuTranslationInputsToMap } from "../types/menu-translations";
import type { Prisma } from "../generated/prisma";

const DEFAULT_PERMISSIONS = [
  { slug: "users.read", module: "users", action: "read", description: "View users" },
  { slug: "users.write", module: "users", action: "write", description: "Create and update users" },
  { slug: "users.delete", module: "users", action: "delete", description: "Delete users" },
  { slug: "user_registrations.read", module: "user_registrations", action: "read", description: "View customer registration applications" },
  { slug: "user_registrations.write", module: "user_registrations", action: "write", description: "Approve or reject customer registration applications" },
  { slug: "drivers.read", module: "drivers", action: "read", description: "View hired drivers, shifts, attendance, and performance" },
  { slug: "drivers.write", module: "drivers", action: "write", description: "Manage hired drivers, shift assignments, and attendance records" },
  { slug: "roles.read", module: "roles", action: "read", description: "View roles" },
  { slug: "roles.write", module: "roles", action: "write", description: "Create and update roles" },
  { slug: "roles.delete", module: "roles", action: "delete", description: "Delete roles" },
  { slug: "menus.read", module: "menus", action: "read", description: "View menus" },
  { slug: "menus.write", module: "menus", action: "write", description: "Create and update menus" },
  { slug: "menus.delete", module: "menus", action: "delete", description: "Delete menus" },
  { slug: "notifications.read", module: "notifications", action: "read", description: "View notification settings" },
  { slug: "notifications.write", module: "notifications", action: "write", description: "Manage notification settings" },
  { slug: "notifications.delete", module: "notifications", action: "delete", description: "Delete notification resources" },
  { slug: "system_settings.read", module: "system_settings", action: "read", description: "View system settings" },
  { slug: "system_settings.write", module: "system_settings", action: "write", description: "Update system settings" },
  { slug: "audit_logs.read", module: "audit_logs", action: "read", description: "View audit logs" },
  { slug: "vehicle_types.read", module: "vehicle_types", action: "read", description: "View vehicle types" },
  { slug: "vehicle_types.write", module: "vehicle_types", action: "write", description: "Create and update vehicle types" },
  { slug: "vehicle_types.delete", module: "vehicle_types", action: "delete", description: "Delete vehicle types" },
  { slug: "vehicle_classes.read", module: "vehicle_classes", action: "read", description: "View vehicle classes" },
  { slug: "vehicle_classes.write", module: "vehicle_classes", action: "write", description: "Create and update vehicle classes" },
  { slug: "vehicle_classes.delete", module: "vehicle_classes", action: "delete", description: "Delete vehicle classes" },
  { slug: "vehicles.read", module: "vehicles", action: "read", description: "View vehicles" },
  { slug: "vehicles.write", module: "vehicles", action: "write", description: "Create and update vehicles" },
  { slug: "vehicles.assign_driver", module: "vehicles", action: "assign_driver", description: "Assign default drivers to vehicles" },
  { slug: "vehicles.delete", module: "vehicles", action: "delete", description: "Delete vehicles" },
  { slug: "compliance.read", module: "compliance", action: "read", description: "View fleet insurance and inspection compliance" },
  { slug: "compliance.write", module: "compliance", action: "write", description: "Update vehicle insurance and inspection records" },
  { slug: "maintenance_work_types.read", module: "maintenance_work_types", action: "read", description: "View maintenance work types" },
  { slug: "maintenance_work_types.write", module: "maintenance_work_types", action: "write", description: "Create and update maintenance work types" },
  { slug: "maintenance_work_types.delete", module: "maintenance_work_types", action: "delete", description: "Delete maintenance work types" },
  { slug: "regions.read", module: "regions", action: "read", description: "View regions" },
  { slug: "regions.write", module: "regions", action: "write", description: "Create and update regions" },
  { slug: "regions.delete", module: "regions", action: "delete", description: "Delete regions" },
  { slug: "locations.read", module: "locations", action: "read", description: "View locations" },
  { slug: "locations.write", module: "locations", action: "write", description: "Create and update locations" },
  { slug: "locations.delete", module: "locations", action: "delete", description: "Delete locations" },
  { slug: "fare_plans.read", module: "fare_plans", action: "read", description: "View fare plans" },
  { slug: "fare_plans.write", module: "fare_plans", action: "write", description: "Create and update fare plans" },
  { slug: "fare_plans.delete", module: "fare_plans", action: "delete", description: "Delete fare plans" },
  { slug: "booking_policies.read", module: "booking_policies", action: "read", description: "View booking policies" },
  { slug: "booking_policies.write", module: "booking_policies", action: "write", description: "Create and update booking policies" },
  { slug: "booking_policies.delete", module: "booking_policies", action: "delete", description: "Delete booking policies" },
  { slug: "contracts.read", module: "contracts", action: "read", description: "View customer contracts" },
  { slug: "contracts.write", module: "contracts", action: "write", description: "Create and update customer contracts" },
  { slug: "contracts.delete", module: "contracts", action: "delete", description: "Delete customer contracts" },
  { slug: "invoices.read", module: "invoices", action: "read", description: "View invoices" },
  { slug: "invoices.write", module: "invoices", action: "write", description: "Generate and manage invoices" },
  { slug: "invoices.delete", module: "invoices", action: "delete", description: "Void invoices" },
  { slug: "ride_requests.read", module: "ride_requests", action: "read", description: "View customer ride requests in admin dispatch" },
  { slug: "ride_requests.write", module: "ride_requests", action: "write", description: "Approve, assign, start, complete, or reject ride requests" },
  { slug: "complaints.read", module: "complaints", action: "read", description: "View and manage customer complaints" },
  { slug: "complaints.write", module: "complaints", action: "write", description: "Update complaint status, priority, assignment, and response" },
  { slug: "driver.vehicle", module: "driver", action: "vehicle", description: "Driver can get their assigned vehicle (GET /api/ride-requests/driver/vehicle)" },
  { slug: "driver.trip", module: "driver", action: "trip", description: "Driver can get trip details for assigned rides (GET /api/ride-requests/driver/:id)" },
  { slug: "driver.upcoming", module: "driver", action: "upcoming", description: "Driver can list upcoming trips and receive live trip events on the realtime Socket.IO namespace (/api/ws)" },
  { slug: "driver.history", module: "driver", action: "history", description: "Driver can list past trips (GET /api/ride-requests/driver/history)" },
  { slug: "driver.maintenance", module: "driver", action: "maintenance", description: "Driver can list and request maintenance for their assigned vehicle (GET/POST /api/ride-requests/driver/maintenance)" },
  { slug: "driver.fuel", module: "driver", action: "fuel", description: "Driver can list and log fuel refills for their assigned vehicle (GET/POST /api/ride-requests/driver/fuel)" },
  { slug: "driver.location", module: "driver", action: "location", description: "Driver can publish live GPS location on the realtime Socket.IO namespace (/api/ws)" },
  { slug: "customer_dashboard.read", module: "customer_dashboard", action: "read", description: "View customer dashboard" },
  { slug: "customer_profile.read", module: "customer_profile", action: "read", description: "View customer profile" },
  { slug: "customer_requests.read", module: "customer_requests", action: "read", description: "View and book ride requests" },
  { slug: "customer_requests.write", module: "customer_requests", action: "write", description: "Submit ride requests" },
  { slug: "customer_contracts.read", module: "customer_contracts", action: "read", description: "View enrolled contracts in the customer portal" },
  { slug: "customer_invoices.read", module: "customer_invoices", action: "read", description: "View issued invoices in the customer portal" },
  { slug: "customer_complaints.read", module: "customer_complaints", action: "read", description: "View submitted complaints in the customer portal" },
  { slug: "customer_complaints.write", module: "customer_complaints", action: "write", description: "Submit customer complaints" },
  { slug: "devices.register", module: "devices", action: "register", description: "Register FCM device tokens for push notifications (POST /api/devices/tokens)" },
] as const;

const REMOVED_MENU_SLUGS = [
  "permissions",
  "endpoints",
  "registration-forms",
  "customer-portal",
  "customer-profile",
  "user",
  "notifications-email",
  "notifications-sms",
  "customer-requests",
  "drivers-applications",
  "applications",
] as const;

const REMOVED_MENU_PATHS = ["/admin/drivers/applications"] as const;

const REMOVED_PERMISSION_SLUGS = [
  "permissions.read",
  "permissions.write",
  "permissions.delete",
  "endpoints.read",
  "endpoints.write",
  "endpoints.delete",
  "registration_forms.read",
  "registration_forms.write",
  "registration_forms.delete",
] as const;

const REMOVED_ENDPOINT_SLUGS = [
  "permissions.create",
  "permissions.update",
  "permissions.delete",
  "endpoints.list",
  "endpoints.create",
  "endpoints.update",
  "endpoints.delete",
  "registration_forms.list",
  "registration_forms.public",
  "registration_forms.get",
  "registration_forms.create",
  "registration_forms.update",
  "registration_forms.delete",
  "ride_requests.driver_location_ws",
  "ride_requests.driver_upcoming_ws",
  "vehicles.location_ws",
] as const;

const DEFAULT_MENUS = [
  {
    slug: "dashboard",
    path: "/admin",
    icon: "layout-dashboard",
    sortOrder: 0,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Dashboard" },
      { locale: "am", label: "ዳሽቦርድ" },
    ],
  },
  {
    slug: "account-management",
    path: null,
    icon: "users",
    sortOrder: 10,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Account Management" },
      { locale: "am", label: "የመለያ አስተዳደር" },
    ],
  },
  {
    slug: "users",
    path: "/admin/users",
    icon: "users",
    sortOrder: 10,
    parentSlug: "account-management",
    translations: [
      { locale: "en", label: "Users" },
      { locale: "am", label: "ተጠቃሚዎች" },
    ],
  },
  {
    slug: "user-registrations",
    path: "/admin/user-registrations",
    icon: "clipboard-check",
    sortOrder: 20,
    parentSlug: "account-management",
    translations: [
      { locale: "en", label: "Registrations" },
      { locale: "am", label: "ምዝገባዎች" },
    ],
  },
  {
    slug: "drivers",
    path: null,
    icon: "id-card",
    sortOrder: 35,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Driver Management" },
      { locale: "am", label: "የአሽከርካሪ አስተዳደር" },
    ],
  },
  {
    slug: "drivers-directory",
    path: "/admin/drivers",
    icon: "id-card",
    sortOrder: 10,
    parentSlug: "drivers",
    translations: [
      { locale: "en", label: "Drivers" },
      { locale: "am", label: "አሽከርካሪዎች" },
    ],
  },
  {
    slug: "drivers-shifts",
    path: "/admin/drivers/shifts",
    icon: "calendar-clock",
    sortOrder: 15,
    parentSlug: "drivers",
    translations: [
      { locale: "en", label: "Shifts" },
      { locale: "am", label: "ፈረቃዎች" },
    ],
  },
  {
    slug: "drivers-attendance",
    path: "/admin/drivers/attendance",
    icon: "clock",
    sortOrder: 20,
    parentSlug: "drivers",
    translations: [
      { locale: "en", label: "Attendance" },
      { locale: "am", label: "መገኘት" },
    ],
  },
  {
    slug: "drivers-performance",
    path: "/admin/drivers/performance",
    icon: "activity",
    sortOrder: 30,
    parentSlug: "drivers",
    translations: [
      { locale: "en", label: "Performance" },
      { locale: "am", label: "አፈጻጸም" },
    ],
  },
  {
    slug: "access-control",
    path: null,
    icon: "shield-check",
    sortOrder: 20,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Access Control" },
      { locale: "am", label: "የመዳረሻ ቁጥጥር" },
    ],
  },
  {
    slug: "roles",
    path: "/admin/roles",
    icon: "shield",
    sortOrder: 10,
    parentSlug: "access-control",
    translations: [
      { locale: "en", label: "Roles" },
      { locale: "am", label: "ሚናዎች" },
    ],
  },
  {
    slug: "menus",
    path: "/admin/menus",
    icon: "menu",
    sortOrder: 30,
    parentSlug: "access-control",
    translations: [
      { locale: "en", label: "Menus" },
      { locale: "am", label: "ሜኑዎች" },
    ],
  },
  {
    slug: "audit-logs",
    path: "/admin/audit-logs",
    icon: "scroll-text",
    sortOrder: 40,
    parentSlug: "access-control",
    translations: [
      { locale: "en", label: "Audit Logs" },
      { locale: "am", label: "የኦዲት መዝገቦች" },
    ],
  },
  {
    slug: "system-settings",
    path: null,
    icon: "settings",
    sortOrder: 60,
    parentSlug: null,
    translations: [
      { locale: "en", label: "System Settings" },
      { locale: "am", label: "የስርዓት ቅንብሮች" },
    ],
  },
  {
    slug: "notifications",
    path: "/admin/notifications",
    icon: "bell",
    sortOrder: 10,
    parentSlug: "system-settings",
    translations: [
      { locale: "en", label: "Notifications" },
      { locale: "am", label: "ማሳወቂያዎች" },
    ],
  },
  {
    slug: "notification-send",
    path: "/admin/notifications/send",
    icon: "send",
    sortOrder: 15,
    parentSlug: "system-settings",
    translations: [
      { locale: "en", label: "Send message" },
      { locale: "am", label: "መልዕክት ላክ" },
    ],
  },
  {
    slug: "notification-templates",
    path: "/admin/notification-templates",
    icon: "messages-square",
    sortOrder: 20,
    parentSlug: "system-settings",
    translations: [
      { locale: "en", label: "Message Templates" },
      { locale: "am", label: "የመልዕክት አብነቶች" },
    ],
  },
  {
    slug: "notification-logs",
    path: "/admin/notification-logs",
    icon: "scroll-text",
    sortOrder: 30,
    parentSlug: "system-settings",
    translations: [
      { locale: "en", label: "Delivery Log" },
      { locale: "am", label: "የማድረስ መዝገብ" },
    ],
  },
  {
    slug: "deadline-settings",
    path: "/admin/system-settings/deadline",
    icon: "clock",
    sortOrder: 40,
    parentSlug: "system-settings",
    translations: [
      { locale: "en", label: "Deadline Hub" },
      { locale: "am", label: "የጊዜ ገደብ ማዕከል" },
    ],
  },
  {
    slug: "branding-settings",
    path: "/admin/system-settings/branding",
    icon: "palette",
    sortOrder: 50,
    parentSlug: "system-settings",
    translations: [
      { locale: "en", label: "Branding" },
      { locale: "am", label: "ብራንድ" },
    ],
  },
  {
    slug: "payment-gateway-settings",
    path: "/admin/system-settings/payment-gateway",
    icon: "credit-card",
    sortOrder: 55,
    parentSlug: "system-settings",
    translations: [
      { locale: "en", label: "Payment Gateway" },
      { locale: "am", label: "የክፍያ መግቢያ" },
    ],
  },
  {
    slug: "fleet",
    path: null,
    icon: "truck",
    sortOrder: 40,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Vehicle Management" },
      { locale: "am", label: "የተሽከርካሪ አስተዳደር" },
    ],
  },
  {
    slug: "fleet-vehicles",
    path: "/admin/fleet/vehicles",
    icon: "truck",
    sortOrder: 10,
    parentSlug: "fleet",
    translations: [
      { locale: "en", label: "Vehicles" },
      { locale: "am", label: "ተሽከርካሪዎች" },
    ],
  },
  {
    slug: "fleet-maintenance",
    path: "/admin/fleet/maintenance",
    icon: "wrench",
    sortOrder: 20,
    parentSlug: "fleet",
    translations: [
      { locale: "en", label: "Maintenance" },
      { locale: "am", label: "ጥገና" },
    ],
  },
  {
    slug: "fleet-fuel",
    path: "/admin/fleet/fuel",
    icon: "fuel",
    sortOrder: 30,
    parentSlug: "fleet",
    translations: [
      { locale: "en", label: "Fuel Consumption" },
      { locale: "am", label: "የነዳጅ ፍጆታ" },
    ],
  },
  {
    slug: "fleet-setup",
    path: null,
    icon: "layers",
    sortOrder: 40,
    parentSlug: "fleet",
    translations: [
      { locale: "en", label: "Setup" },
      { locale: "am", label: "ማዋቀር" },
    ],
  },
  {
    slug: "vehicle-types",
    path: "/admin/fleet/vehicle-types",
    icon: "layers",
    sortOrder: 10,
    parentSlug: "fleet-setup",
    translations: [
      { locale: "en", label: "Vehicle Types" },
      { locale: "am", label: "የተሽከርካሪ አይነቶች" },
    ],
  },
  {
    slug: "vehicle-classes",
    path: "/admin/fleet/vehicle-classes",
    icon: "award",
    sortOrder: 20,
    parentSlug: "fleet-setup",
    translations: [
      { locale: "en", label: "Vehicle Classes" },
      { locale: "am", label: "የተሽከርካሪ ክፍሎች" },
    ],
  },
  {
    slug: "maintenance-work-types",
    path: "/admin/fleet/maintenance-work-types",
    icon: "wrench",
    sortOrder: 30,
    parentSlug: "fleet-setup",
    translations: [
      { locale: "en", label: "Maintenance Types" },
      { locale: "am", label: "የጥገና አይነቶች" },
    ],
  },
  {
    slug: "compliance",
    path: null,
    icon: "shield-check",
    sortOrder: 45,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Compliance" },
      { locale: "am", label: "ተገዢነት" },
    ],
  },
  {
    slug: "compliance-overview",
    path: "/admin/compliance",
    icon: "layout-dashboard",
    sortOrder: 10,
    parentSlug: "compliance",
    translations: [
      { locale: "en", label: "Overview" },
      { locale: "am", label: "አጠቃላይ እይታ" },
    ],
  },
  {
    slug: "compliance-insurance",
    path: "/admin/compliance/insurance",
    icon: "shield-check",
    sortOrder: 20,
    parentSlug: "compliance",
    translations: [
      { locale: "en", label: "Insurance" },
      { locale: "am", label: "ኢንሹራንስ" },
    ],
  },
  {
    slug: "compliance-inspection",
    path: "/admin/compliance/inspection",
    icon: "clipboard-list",
    sortOrder: 30,
    parentSlug: "compliance",
    translations: [
      { locale: "en", label: "Inspection" },
      { locale: "am", label: "ምርመራ" },
    ],
  },
  {
    slug: "location-management",
    path: null,
    icon: "map",
    sortOrder: 30,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Location Management" },
      { locale: "am", label: "የቦታ አስተዳደር" },
    ],
  },
  {
    slug: "location-regions",
    path: "/admin/locations/regions",
    icon: "map",
    sortOrder: 10,
    parentSlug: "location-management",
    translations: [
      { locale: "en", label: "Regions" },
      { locale: "am", label: "ክልሎች" },
    ],
  },
  {
    slug: "location-sites",
    path: "/admin/locations/sites",
    icon: "map-pin",
    sortOrder: 20,
    parentSlug: "location-management",
    translations: [
      { locale: "en", label: "Locations" },
      { locale: "am", label: "ቦታዎች" },
    ],
  },
  {
    slug: "dispatch",
    path: null,
    icon: "route",
    sortOrder: 49,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Dispatch" },
      { locale: "am", label: "መላኪያ" },
    ],
  },
  {
    slug: "dispatch-overview",
    path: "/admin/dispatch",
    icon: "layout-dashboard",
    sortOrder: 5,
    parentSlug: "dispatch",
    translations: [
      { locale: "en", label: "Overview" },
      { locale: "am", label: "አጠቃላይ እይታ" },
    ],
  },
  {
    slug: "ride-requests",
    path: "/admin/ride-requests",
    icon: "clipboard-list",
    sortOrder: 10,
    parentSlug: "dispatch",
    translations: [
      { locale: "en", label: "Ride Requests" },
      { locale: "am", label: "የጉዞ ጥያቄዎች" },
    ],
  },
  {
    slug: "complaints",
    path: "/admin/complaints",
    icon: "messages-square",
    sortOrder: 50,
    parentSlug: "dispatch",
    translations: [
      { locale: "en", label: "Complaints" },
      { locale: "am", label: "ቅሬታዎች" },
    ],
  },
  {
    slug: "billing",
    path: null,
    icon: "receipt",
    sortOrder: 50,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Billing" },
      { locale: "am", label: "ክፍያ" },
    ],
  },
  {
    slug: "fare-plans",
    path: "/admin/billing/fare-plans",
    icon: "coins",
    sortOrder: 10,
    parentSlug: "billing",
    translations: [
      { locale: "en", label: "Fare Plans" },
      { locale: "am", label: "የክፍያ ዕቅዶች" },
    ],
  },
  {
    slug: "booking-policies",
    path: "/admin/billing/booking-policies",
    icon: "clipboard-list",
    sortOrder: 15,
    parentSlug: "billing",
    translations: [
      { locale: "en", label: "Booking Policies" },
      { locale: "am", label: "የቦታ ማስያዝ ፖሊሲዎች" },
    ],
  },
  {
    slug: "contracts",
    path: "/admin/billing/contracts",
    icon: "file-text",
    sortOrder: 20,
    parentSlug: "billing",
    translations: [
      { locale: "en", label: "Contracts" },
      { locale: "am", label: "ውሎች" },
    ],
  },
  {
    slug: "invoices",
    path: "/admin/billing/invoices",
    icon: "receipt-text",
    sortOrder: 30,
    parentSlug: "billing",
    translations: [
      { locale: "en", label: "Invoices" },
      { locale: "am", label: "ደረሰኞች" },
    ],
  },
  {
    slug: "customer-dashboard",
    path: "/dashboard",
    icon: "layout-dashboard",
    sortOrder: 70,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Dashboard" },
      { locale: "am", label: "ዳሽቦርድ" },
    ],
  },
  {
    slug: "customer-request-history",
    path: "/dashboard/my-requests",
    icon: "scroll-text",
    sortOrder: 73,
    parentSlug: null,
    translations: [
      { locale: "en", label: "My Requests" },
      { locale: "am", label: "ጥያቄዎቼ" },
    ],
  },
  {
    slug: "customer-contracts",
    path: "/dashboard/my-contracts",
    icon: "file-text",
    sortOrder: 74,
    parentSlug: null,
    translations: [
      { locale: "en", label: "My Contracts" },
      { locale: "am", label: "ኮንትራቶቼ" },
    ],
  },
  {
    slug: "customer-invoices",
    path: "/dashboard/my-invoices",
    icon: "receipt-text",
    sortOrder: 75,
    parentSlug: null,
    translations: [
      { locale: "en", label: "My Invoices" },
      { locale: "am", label: "ደረሰኞቼ" },
    ],
  },
  {
    slug: "customer-complaints",
    path: "/dashboard/complaints",
    icon: "messages-square",
    sortOrder: 76,
    parentSlug: null,
    translations: [
      { locale: "en", label: "Complaints" },
      { locale: "am", label: "ቅሬታዎች" },
    ],
  },
] as const;

const DEFAULT_ENDPOINTS: Array<{
  slug: string;
  method: HttpMethod;
  path: string;
  description: string;
  permissionSlug: string;
}> = [
  { slug: "users.list", method: "GET", path: "/api/users", description: "List users", permissionSlug: "users.read" },
  { slug: "users.create", method: "POST", path: "/api/users", description: "Create user", permissionSlug: "users.write" },
  { slug: "users.driver_profile.upsert", method: "PUT", path: "/api/users/:id/driver-profile", description: "Create or update a user's driver license profile", permissionSlug: "users.write" },
  { slug: "driver_attendance.list", method: "GET", path: "/api/driver-attendance", description: "List driver attendance for a work date", permissionSlug: "drivers.read" },
  { slug: "driver_attendance.summary", method: "GET", path: "/api/driver-attendance/summary", description: "Summarize driver attendance for a work date", permissionSlug: "drivers.read" },
  { slug: "driver_attendance.upsert", method: "PUT", path: "/api/driver-attendance", description: "Create or update a driver attendance record", permissionSlug: "drivers.write" },
  { slug: "driver_attendance.check_in", method: "POST", path: "/api/driver-attendance/check-in", description: "Check a driver in", permissionSlug: "drivers.write" },
  { slug: "driver_attendance.check_out", method: "POST", path: "/api/driver-attendance/check-out", description: "Check a driver out", permissionSlug: "drivers.write" },
  { slug: "driver_attendance.delete", method: "DELETE", path: "/api/driver-attendance/:id", description: "Clear a driver attendance record", permissionSlug: "drivers.write" },
  { slug: "driver_shifts.templates", method: "GET", path: "/api/driver-shifts/templates", description: "List driver shift templates", permissionSlug: "drivers.read" },
  { slug: "driver_shifts.templates.create", method: "POST", path: "/api/driver-shifts/templates", description: "Create a driver shift period", permissionSlug: "drivers.write" },
  { slug: "driver_shifts.templates.update", method: "PATCH", path: "/api/driver-shifts/templates/:id", description: "Update a driver shift period", permissionSlug: "drivers.write" },
  { slug: "driver_shifts.templates.delete", method: "DELETE", path: "/api/driver-shifts/templates/:id", description: "Delete a driver shift period", permissionSlug: "drivers.write" },
  { slug: "driver_shifts.list", method: "GET", path: "/api/driver-shifts", description: "List driver shift assignments for a work date", permissionSlug: "drivers.read" },
  { slug: "driver_shifts.summary", method: "GET", path: "/api/driver-shifts/summary", description: "Summarize driver shift coverage for a work date", permissionSlug: "drivers.read" },
  { slug: "driver_shifts.week", method: "GET", path: "/api/driver-shifts/week", description: "List driver shift coverage for an ISO week", permissionSlug: "drivers.read" },
  { slug: "driver_shifts.upsert", method: "PUT", path: "/api/driver-shifts", description: "Assign or clear a driver shift for a work date", permissionSlug: "drivers.write" },
  { slug: "driver_shifts.delete", method: "DELETE", path: "/api/driver-shifts/:id", description: "Clear a driver shift assignment", permissionSlug: "drivers.write" },
  { slug: "business_tin.lookup", method: "GET", path: "/api/business-tin/:tin", description: "Look up a business TIN with eTrade registration", permissionSlug: "users.read" },
  { slug: "business_tin.license.lookup", method: "GET", path: "/api/business-tin/:tin/license", description: "Look up a business trade license by TIN and license number", permissionSlug: "users.read" },
  { slug: "roles.list", method: "GET", path: "/api/roles", description: "List roles", permissionSlug: "roles.read" },
  { slug: "roles.create", method: "POST", path: "/api/roles", description: "Create role", permissionSlug: "roles.write" },
  { slug: "roles.update", method: "PATCH", path: "/api/roles/:id", description: "Update role", permissionSlug: "roles.write" },
  { slug: "roles.delete", method: "DELETE", path: "/api/roles/:id", description: "Delete role", permissionSlug: "roles.delete" },
  { slug: "permissions.list", method: "GET", path: "/api/permissions", description: "List permissions", permissionSlug: "menus.read" },
  { slug: "menus.list", method: "GET", path: "/api/menus", description: "List menus", permissionSlug: "menus.read" },
  { slug: "menus.create", method: "POST", path: "/api/menus", description: "Create menu", permissionSlug: "menus.write" },
  { slug: "menus.update", method: "PATCH", path: "/api/menus/:id", description: "Update menu", permissionSlug: "menus.write" },
  { slug: "menus.delete", method: "DELETE", path: "/api/menus/:id", description: "Delete menu", permissionSlug: "menus.delete" },
  { slug: "menus.navigation", method: "GET", path: "/api/menus/navigation", description: "Navigation menu for current user", permissionSlug: "menus.read" },
  { slug: "notifications.email.get", method: "GET", path: "/api/notifications/email", description: "Get email notification configuration", permissionSlug: "notifications.read" },
  { slug: "notifications.email.update", method: "PATCH", path: "/api/notifications/email", description: "Update email notification configuration", permissionSlug: "notifications.write" },
  { slug: "notifications.sms.get", method: "GET", path: "/api/notifications/sms", description: "Get SMS notification configuration", permissionSlug: "notifications.read" },
  { slug: "notifications.sms.update", method: "PATCH", path: "/api/notifications/sms", description: "Update SMS notification configuration", permissionSlug: "notifications.write" },
  { slug: "notifications.sms.test", method: "POST", path: "/api/notifications/sms/test", description: "Send test SMS", permissionSlug: "notifications.write" },
  { slug: "notifications.push.status", method: "GET", path: "/api/notifications/push/status", description: "Check push notification service configuration", permissionSlug: "notifications.read" },
  { slug: "notifications.push.broadcast", method: "POST", path: "/api/notifications/push/broadcast", description: "Broadcast push notification to mobile devices", permissionSlug: "notifications.write" },
  { slug: "notifications.push.test", method: "POST", path: "/api/notifications/push/test", description: "Send test push notification to one user", permissionSlug: "notifications.write" },
  { slug: "notifications.send", method: "POST", path: "/api/notifications/send", description: "Send a custom email, SMS, and/or push message to a group or selected people", permissionSlug: "notifications.write" },
  { slug: "devices.tokens.register", method: "POST", path: "/api/devices/tokens", description: "Register FCM device token for the authenticated user", permissionSlug: "devices.register" },
  { slug: "notifications.ride_requests.rules.list", method: "GET", path: "/api/notifications/templates", description: "List notification templates", permissionSlug: "notifications.read" },
  { slug: "notifications.ride_requests.rules.update", method: "PUT", path: "/api/notifications/templates", description: "Update notification templates", permissionSlug: "notifications.write" },
  { slug: "notifications.ride_requests.rules.test", method: "POST", path: "/api/notifications/templates/:id/test", description: "Send test notification template", permissionSlug: "notifications.write" },
  { slug: "notifications.delivery_logs.list", method: "GET", path: "/api/notification-delivery-logs", description: "List notification delivery logs", permissionSlug: "notifications.read" },
  { slug: "notifications.delivery_logs.get", method: "GET", path: "/api/notification-delivery-logs/:id", description: "Get notification delivery log", permissionSlug: "notifications.read" },
  { slug: "audit_logs.list", method: "GET", path: "/api/audit-logs", description: "List audit logs", permissionSlug: "audit_logs.read" },
  { slug: "audit_logs.get", method: "GET", path: "/api/audit-logs/:id", description: "Get audit log entry", permissionSlug: "audit_logs.read" },
  { slug: "vehicle_types.list", method: "GET", path: "/api/vehicle-types", description: "List vehicle types", permissionSlug: "vehicle_types.read" },
  { slug: "vehicle_types.active", method: "GET", path: "/api/vehicle-types/active", description: "List active vehicle types", permissionSlug: "vehicle_types.read" },
  { slug: "vehicle_types.create", method: "POST", path: "/api/vehicle-types", description: "Create vehicle type", permissionSlug: "vehicle_types.write" },
  { slug: "vehicle_types.update", method: "PATCH", path: "/api/vehicle-types/:id", description: "Update vehicle type", permissionSlug: "vehicle_types.write" },
  { slug: "vehicle_types.delete", method: "DELETE", path: "/api/vehicle-types/:id", description: "Delete vehicle type", permissionSlug: "vehicle_types.delete" },
  { slug: "vehicle_classes.list", method: "GET", path: "/api/vehicle-classes", description: "List vehicle classes", permissionSlug: "vehicle_classes.read" },
  { slug: "vehicle_classes.active", method: "GET", path: "/api/vehicle-classes/active", description: "List active vehicle classes", permissionSlug: "vehicle_classes.read" },
  { slug: "vehicle_classes.create", method: "POST", path: "/api/vehicle-classes", description: "Create vehicle class", permissionSlug: "vehicle_classes.write" },
  { slug: "vehicle_classes.update", method: "PATCH", path: "/api/vehicle-classes/:id", description: "Update vehicle class", permissionSlug: "vehicle_classes.write" },
  { slug: "vehicle_classes.delete", method: "DELETE", path: "/api/vehicle-classes/:id", description: "Delete vehicle class", permissionSlug: "vehicle_classes.delete" },
  { slug: "vehicles.list", method: "GET", path: "/api/vehicles", description: "List vehicles", permissionSlug: "vehicles.read" },
  { slug: "vehicles.compliance_summary", method: "GET", path: "/api/vehicles/compliance/summary", description: "Fleet compliance summary counts", permissionSlug: "compliance.read" },
  { slug: "vehicles.driver_options", method: "GET", path: "/api/vehicles/driver-options", description: "List assignable drivers", permissionSlug: "vehicles.assign_driver" },
  { slug: "vehicles.get", method: "GET", path: "/api/vehicles/:id", description: "Get vehicle", permissionSlug: "vehicles.read" },
  { slug: "vehicles.location", method: "GET", path: "/api/vehicles/:id/location", description: "Get latest vehicle location snapshot", permissionSlug: "vehicles.read" },
  { slug: "vehicles.history", method: "GET", path: "/api/vehicles/:id/history", description: "List vehicle history events", permissionSlug: "vehicles.read" },
  { slug: "vehicles.maintenance.list", method: "GET", path: "/api/vehicles/:id/maintenance", description: "List vehicle maintenance logs", permissionSlug: "vehicles.read" },
  { slug: "vehicles.maintenance.list_all", method: "GET", path: "/api/vehicles/maintenance", description: "List maintenance logs across the fleet", permissionSlug: "vehicles.read" },
  { slug: "vehicles.maintenance.summary", method: "GET", path: "/api/vehicles/maintenance/summary", description: "Fleet maintenance summary", permissionSlug: "vehicles.read" },
  { slug: "vehicles.maintenance.create", method: "POST", path: "/api/vehicles/:id/maintenance", description: "Create vehicle maintenance log", permissionSlug: "vehicles.write" },
  { slug: "vehicles.maintenance.update", method: "PATCH", path: "/api/vehicles/:id/maintenance/:maintenanceId", description: "Update vehicle maintenance log", permissionSlug: "vehicles.write" },
  { slug: "vehicles.fuel.list", method: "GET", path: "/api/vehicles/:id/fuel", description: "List vehicle fuel logs", permissionSlug: "vehicles.read" },
  { slug: "vehicles.fuel.list_all", method: "GET", path: "/api/vehicles/fuel", description: "List fuel logs across the fleet", permissionSlug: "vehicles.read" },
  { slug: "vehicles.fuel.summary", method: "GET", path: "/api/vehicles/fuel/summary", description: "Fleet fuel consumption summary", permissionSlug: "vehicles.read" },
  { slug: "vehicles.fuel.create", method: "POST", path: "/api/vehicles/:id/fuel", description: "Create vehicle fuel log", permissionSlug: "vehicles.write" },
  { slug: "vehicles.fuel.update", method: "PATCH", path: "/api/vehicles/:id/fuel/:fuelLogId", description: "Update vehicle fuel log", permissionSlug: "vehicles.write" },
  { slug: "vehicles.geofences.list", method: "GET", path: "/api/vehicles/:id/geofences", description: "List vehicle geofences", permissionSlug: "vehicles.read" },
  { slug: "vehicles.geofences.create", method: "POST", path: "/api/vehicles/:id/geofences", description: "Create vehicle geofence", permissionSlug: "vehicles.write" },
  { slug: "vehicles.geofences.update", method: "PATCH", path: "/api/vehicles/:id/geofences/:geofenceId", description: "Update vehicle geofence", permissionSlug: "vehicles.write" },
  { slug: "vehicles.geofences.delete", method: "DELETE", path: "/api/vehicles/:id/geofences/:geofenceId", description: "Delete vehicle geofence", permissionSlug: "vehicles.write" },
  { slug: "maintenance_work_types.list", method: "GET", path: "/api/maintenance-work-types", description: "List maintenance work types", permissionSlug: "maintenance_work_types.read" },
  { slug: "maintenance_work_types.active", method: "GET", path: "/api/maintenance-work-types/active", description: "List active maintenance work types", permissionSlug: "maintenance_work_types.read" },
  { slug: "maintenance_work_types.create", method: "POST", path: "/api/maintenance-work-types", description: "Create maintenance work type", permissionSlug: "maintenance_work_types.write" },
  { slug: "maintenance_work_types.update", method: "PATCH", path: "/api/maintenance-work-types/:id", description: "Update maintenance work type", permissionSlug: "maintenance_work_types.write" },
  { slug: "maintenance_work_types.delete", method: "DELETE", path: "/api/maintenance-work-types/:id", description: "Delete maintenance work type", permissionSlug: "maintenance_work_types.delete" },
  { slug: "vehicles.create", method: "POST", path: "/api/vehicles", description: "Create vehicle", permissionSlug: "vehicles.write" },
  { slug: "vehicles.update", method: "PATCH", path: "/api/vehicles/:id", description: "Update vehicle", permissionSlug: "vehicles.write" },
  { slug: "vehicles.delete", method: "DELETE", path: "/api/vehicles/:id", description: "Delete vehicle", permissionSlug: "vehicles.delete" },
  { slug: "regions.list", method: "GET", path: "/api/regions", description: "List regions", permissionSlug: "regions.read" },
  { slug: "regions.active", method: "GET", path: "/api/regions/active", description: "List active regions", permissionSlug: "regions.read" },
  { slug: "regions.create", method: "POST", path: "/api/regions", description: "Create region", permissionSlug: "regions.write" },
  { slug: "regions.update", method: "PATCH", path: "/api/regions/:id", description: "Update region", permissionSlug: "regions.write" },
  { slug: "regions.delete", method: "DELETE", path: "/api/regions/:id", description: "Delete region", permissionSlug: "regions.delete" },
  { slug: "locations.list", method: "GET", path: "/api/locations", description: "List locations", permissionSlug: "locations.read" },
  { slug: "locations.get", method: "GET", path: "/api/locations/:id", description: "Get location", permissionSlug: "locations.read" },
  { slug: "locations.create", method: "POST", path: "/api/locations", description: "Create location", permissionSlug: "locations.write" },
  { slug: "locations.update", method: "PATCH", path: "/api/locations/:id", description: "Update location", permissionSlug: "locations.write" },
  { slug: "locations.delete", method: "DELETE", path: "/api/locations/:id", description: "Delete location", permissionSlug: "locations.delete" },
  { slug: "fare_plans.list", method: "GET", path: "/api/fare-plans", description: "List fare plans", permissionSlug: "fare_plans.read" },
  { slug: "fare_plans.resolve", method: "GET", path: "/api/fare-plans/resolve", description: "Resolve fare plan for vehicle scope", permissionSlug: "fare_plans.read" },
  { slug: "fare_plans.get", method: "GET", path: "/api/fare-plans/:id", description: "Get fare plan", permissionSlug: "fare_plans.read" },
  { slug: "fare_plans.create", method: "POST", path: "/api/fare-plans", description: "Create fare plan", permissionSlug: "fare_plans.write" },
  { slug: "fare_plans.update", method: "PATCH", path: "/api/fare-plans/:id", description: "Update fare plan", permissionSlug: "fare_plans.write" },
  { slug: "fare_plans.delete", method: "DELETE", path: "/api/fare-plans/:id", description: "Delete fare plan", permissionSlug: "fare_plans.delete" },
  { slug: "booking_policies.list", method: "GET", path: "/api/booking-policies", description: "List booking policies", permissionSlug: "booking_policies.read" },
  { slug: "booking_policies.active", method: "GET", path: "/api/booking-policies/active", description: "List active booking policies", permissionSlug: "booking_policies.read" },
  { slug: "booking_policies.get", method: "GET", path: "/api/booking-policies/:id", description: "Get booking policy", permissionSlug: "booking_policies.read" },
  { slug: "booking_policies.create", method: "POST", path: "/api/booking-policies", description: "Create booking policy", permissionSlug: "booking_policies.write" },
  { slug: "booking_policies.update", method: "PATCH", path: "/api/booking-policies/:id", description: "Update booking policy", permissionSlug: "booking_policies.write" },
  { slug: "booking_policies.delete", method: "DELETE", path: "/api/booking-policies/:id", description: "Delete booking policy", permissionSlug: "booking_policies.delete" },
  { slug: "contracts.list", method: "GET", path: "/api/contracts", description: "List customer contracts", permissionSlug: "contracts.read" },
  { slug: "contracts.get", method: "GET", path: "/api/contracts/:id", description: "Get customer contract", permissionSlug: "contracts.read" },
  { slug: "contracts.create", method: "POST", path: "/api/contracts", description: "Create customer contract", permissionSlug: "contracts.write" },
  { slug: "contracts.update", method: "PATCH", path: "/api/contracts/:id", description: "Update customer contract", permissionSlug: "contracts.write" },
  { slug: "contracts.delete", method: "DELETE", path: "/api/contracts/:id", description: "Delete customer contract", permissionSlug: "contracts.delete" },
  { slug: "contracts.enrollments", method: "GET", path: "/api/contracts/:id/enrollments", description: "List contract enrollments", permissionSlug: "contracts.read" },
  { slug: "invoices.list", method: "GET", path: "/api/invoices", description: "List invoices", permissionSlug: "invoices.read" },
  { slug: "invoices.get", method: "GET", path: "/api/invoices/:id", description: "Get invoice", permissionSlug: "invoices.read" },
  { slug: "invoices.generate", method: "POST", path: "/api/invoices/generate", description: "Generate invoice from contract enrollment or trip", permissionSlug: "invoices.write" },
  { slug: "invoices.run_automation", method: "POST", path: "/api/invoices/run-automation", description: "Run invoice automation job manually", permissionSlug: "invoices.write" },
  { slug: "invoices.issue", method: "POST", path: "/api/invoices/:id/issue", description: "Issue draft invoice", permissionSlug: "invoices.write" },
  { slug: "invoices.mark_paid", method: "POST", path: "/api/invoices/:id/mark-paid", description: "Mark invoice as paid", permissionSlug: "invoices.write" },
  { slug: "invoices.void", method: "POST", path: "/api/invoices/:id/void", description: "Void invoice", permissionSlug: "invoices.delete" },
  { slug: "system_settings.vat.get", method: "GET", path: "/api/admin/system-settings/vat", description: "Get invoice VAT settings", permissionSlug: "system_settings.read" },
  { slug: "system_settings.vat.update", method: "PATCH", path: "/api/admin/system-settings/vat", description: "Update invoice VAT settings", permissionSlug: "system_settings.write" },
  { slug: "system_settings.payment_gateway.get", method: "GET", path: "/api/admin/system-settings/payment-gateway", description: "Get payment gateway settings", permissionSlug: "system_settings.read" },
  { slug: "system_settings.payment_gateway.update", method: "PATCH", path: "/api/admin/system-settings/payment-gateway", description: "Update payment gateway settings", permissionSlug: "system_settings.write" },
  { slug: "system_settings.payment_gateway.logo", method: "POST", path: "/api/admin/system-settings/payment-gateway/logo", description: "Upload a payment method logo", permissionSlug: "system_settings.write" },
  { slug: "ride_requests.form_options", method: "GET", path: "/api/ride-requests/form-options", description: "Ride request form options", permissionSlug: "customer_requests.read" },
  { slug: "ride_requests.list", method: "GET", path: "/api/ride-requests", description: "List ride requests", permissionSlug: "customer_requests.read" },
  { slug: "ride_requests.get", method: "GET", path: "/api/ride-requests/:id", description: "Get ride request", permissionSlug: "customer_requests.read" },
  { slug: "ride_requests.create", method: "POST", path: "/api/ride-requests", description: "Create ride request", permissionSlug: "customer_requests.write" },
  { slug: "ride_requests.update", method: "PATCH", path: "/api/ride-requests/:id", description: "Update ride request", permissionSlug: "customer_requests.write" },
  { slug: "ride_requests.cancel", method: "POST", path: "/api/ride-requests/:id/cancel", description: "Cancel ride request", permissionSlug: "customer_requests.write" },
  { slug: "ride_requests.rate_driver", method: "POST", path: "/api/ride-requests/:id/rating", description: "Rate assigned driver after completed trip", permissionSlug: "customer_requests.write" },
  { slug: "customer_billing.contract_enrollments.list", method: "GET", path: "/api/me/contract-enrollments", description: "List contract enrollments for current customer", permissionSlug: "customer_contracts.read" },
  { slug: "customer_billing.contract_enrollments.get", method: "GET", path: "/api/me/contract-enrollments/:id", description: "Get contract enrollment for current customer", permissionSlug: "customer_contracts.read" },
  { slug: "customer_billing.invoices.list", method: "GET", path: "/api/me/invoices", description: "List invoices for current customer", permissionSlug: "customer_invoices.read" },
  { slug: "customer_billing.invoices.get", method: "GET", path: "/api/me/invoices/:id", description: "Get invoice for current customer", permissionSlug: "customer_invoices.read" },
  { slug: "customer_billing.invoices.confirm_payment", method: "POST", path: "/api/me/invoices/:id/confirm-payment", description: "Confirm payment for a single customer invoice", permissionSlug: "customer_invoices.read" },
  { slug: "customer_billing.invoices.confirm_payments", method: "POST", path: "/api/me/invoices/confirm-payments", description: "Confirm payment for multiple outstanding customer invoices", permissionSlug: "customer_invoices.read" },
  { slug: "customer_billing.invoices.stripe_checkout", method: "POST", path: "/api/me/invoices/stripe-checkout", description: "Start a Stripe Checkout session for customer invoices", permissionSlug: "customer_invoices.read" },
  { slug: "customer_billing.invoices.stripe_complete", method: "POST", path: "/api/me/invoices/stripe-complete", description: "Complete a Stripe Checkout session for customer invoices", permissionSlug: "customer_invoices.read" },
  { slug: "customer_billing.payment_options", method: "GET", path: "/api/me/billing/payment-options", description: "Get customer payment method configuration", permissionSlug: "customer_invoices.read" },
  { slug: "ride_requests.driver_vehicle", method: "GET", path: "/api/ride-requests/driver/vehicle", description: "Get vehicle assigned to driver", permissionSlug: "driver.vehicle" },
  { slug: "ride_requests.driver_trip", method: "GET", path: "/api/ride-requests/driver/:id", description: "Get trip details for an assigned driver ride", permissionSlug: "driver.trip" },
  { slug: "ride_requests.driver_trip_status", method: "POST", path: "/api/ride-requests/driver/:id/status", description: "Change status of assigned driver ride (start/complete)", permissionSlug: "driver.trip" },
  { slug: "ride_requests.driver_upcoming", method: "GET", path: "/api/ride-requests/driver/upcoming", description: "List upcoming trips for driver", permissionSlug: "driver.upcoming" },
  { slug: "realtime.ws", method: "GET", path: "SOCKET /api/ws", description: "Unified realtime Socket.IO namespace for live trips, location publish/subscribe, and future events", permissionSlug: "driver.upcoming" },
  { slug: "ride_requests.driver_history", method: "GET", path: "/api/ride-requests/driver/history", description: "List trip history for driver", permissionSlug: "driver.history" },
  { slug: "ride_requests.driver_maintenance_list", method: "GET", path: "/api/ride-requests/driver/maintenance", description: "List maintenance logs for the driver's assigned vehicle", permissionSlug: "driver.maintenance" },
  { slug: "ride_requests.driver_maintenance_create", method: "POST", path: "/api/ride-requests/driver/maintenance", description: "Create a maintenance request for the driver's assigned vehicle", permissionSlug: "driver.maintenance" },
  { slug: "ride_requests.driver_maintenance_update", method: "PATCH", path: "/api/ride-requests/driver/maintenance/:maintenanceId", description: "Update a maintenance log on the driver's assigned vehicle", permissionSlug: "driver.maintenance" },
  { slug: "ride_requests.driver_fuel_list", method: "GET", path: "/api/ride-requests/driver/fuel", description: "List fuel logs for the driver's assigned vehicle", permissionSlug: "driver.fuel" },
  { slug: "ride_requests.driver_fuel_create", method: "POST", path: "/api/ride-requests/driver/fuel", description: "Create a fuel log for the driver's assigned vehicle", permissionSlug: "driver.fuel" },
  { slug: "ride_requests.driver_fuel_update", method: "PATCH", path: "/api/ride-requests/driver/fuel/:fuelLogId", description: "Update a fuel log on the driver's assigned vehicle", permissionSlug: "driver.fuel" },
  { slug: "admin_dispatch.overview", method: "GET", path: "/api/admin/dispatch/overview", description: "Dispatcher working board overview", permissionSlug: "ride_requests.read" },
  { slug: "admin_dispatch.board", method: "GET", path: "/api/admin/dispatch/board", description: "Live dispatch board with trips and vehicle positions", permissionSlug: "ride_requests.read" },
  { slug: "admin_dispatch.auto_assign", method: "POST", path: "/api/admin/dispatch/auto-assign", description: "Auto-assign vehicles by SLA priority", permissionSlug: "ride_requests.write" },
  { slug: "admin_ride_requests.list", method: "GET", path: "/api/admin/ride-requests", description: "List all ride requests", permissionSlug: "ride_requests.read" },
  { slug: "admin_dashboard.analytics", method: "GET", path: "/api/admin/dashboard/analytics", description: "Admin dashboard reporting analytics", permissionSlug: "ride_requests.read" },
  { slug: "admin_ride_requests.get", method: "GET", path: "/api/admin/ride-requests/:id", description: "Get ride request for admin review", permissionSlug: "ride_requests.read" },
  { slug: "admin_ride_requests.assignable_vehicles", method: "GET", path: "/api/admin/ride-requests/:id/assignable-vehicles", description: "List assignable vehicles for ride request", permissionSlug: "ride_requests.read" },
  { slug: "admin_ride_requests.assign", method: "POST", path: "/api/admin/ride-requests/:id/assign", description: "Assign vehicle to ride request", permissionSlug: "ride_requests.write" },
  { slug: "admin_ride_requests.unassign", method: "POST", path: "/api/admin/ride-requests/:id/unassign", description: "Unassign vehicle from ride request", permissionSlug: "ride_requests.write" },
  { slug: "complaints.mine.list", method: "GET", path: "/api/complaints/mine", description: "List current customer's complaints", permissionSlug: "customer_complaints.read" },
  { slug: "complaints.mine.summary", method: "GET", path: "/api/complaints/mine/summary", description: "Summarize current customer's complaints", permissionSlug: "customer_complaints.read" },
  { slug: "complaints.create", method: "POST", path: "/api/complaints", description: "Submit a customer complaint", permissionSlug: "customer_complaints.write" },
  { slug: "complaints.get", method: "GET", path: "/api/complaints/:id", description: "Get current customer's complaint", permissionSlug: "customer_complaints.read" },
  { slug: "complaints.admin.list", method: "GET", path: "/api/complaints/admin", description: "List complaints for administration", permissionSlug: "complaints.read" },
  { slug: "complaints.admin.summary", method: "GET", path: "/api/complaints/admin/summary", description: "Summarize complaints for administration", permissionSlug: "complaints.read" },
  { slug: "complaints.admin.update", method: "PATCH", path: "/api/complaints/admin/:id", description: "Manage a complaint", permissionSlug: "complaints.write" },
];

async function seedPermissions() {
  const permissionIds: string[] = [];

  for (const permission of DEFAULT_PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { slug: permission.slug },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
    permissionIds.push(record.id);
  }

  return permissionIds;
}

async function seedMenus() {
  const permissions = await prisma.permission.findMany();
  const permissionBySlug = new Map(permissions.map((permission) => [permission.slug, permission.id]));
  const menuIdBySlug = new Map<string, string>();

  const parentMenus = DEFAULT_MENUS.filter((menu) => !menu.parentSlug);
  const childMenus = DEFAULT_MENUS.filter((menu) => menu.parentSlug);

  for (const menu of [...parentMenus, ...childMenus]) {
    const translations = menuTranslationInputsToMap(
      menu.translations.map((translation) => ({ ...translation })),
    ) as Prisma.InputJsonValue;

    const parentId = menu.parentSlug ? menuIdBySlug.get(menu.parentSlug) ?? null : null;

    const record = await prisma.menu.upsert({
      where: { slug: menu.slug },
      update: {},
      create: {
        slug: menu.slug,
        path: menu.path,
        icon: menu.icon,
        parentId,
        sortOrder: menu.sortOrder,
        translations,
        isActive: true,
      },
    });

    const menuPermissionIds = inferMenuPermissionSlugs(menu.slug, menu.path)
      .map((slug) => permissionBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    await ensureMenuPermissions(record.id, menuPermissionIds);

    menuIdBySlug.set(menu.slug, record.id);
  }
}

async function seedEndpoints() {
  const permissions = await prisma.permission.findMany();
  const permissionBySlug = new Map(permissions.map((permission) => [permission.slug, permission.id]));

  for (const endpoint of DEFAULT_ENDPOINTS) {
    await prisma.endpoint.upsert({
      where: { slug: endpoint.slug },
      update: {
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        permissionId: permissionBySlug.get(endpoint.permissionSlug) ?? null,
        isActive: true,
      },
      create: {
        slug: endpoint.slug,
        method: endpoint.method,
        path: endpoint.path,
        description: endpoint.description,
        permissionId: permissionBySlug.get(endpoint.permissionSlug) ?? null,
        isActive: true,
      },
    });
  }
}

async function deleteRemovedMenus() {
  await prisma.menu.deleteMany({
    where: {
      OR: [
        { slug: { in: [...REMOVED_MENU_SLUGS] } },
        { path: { in: [...REMOVED_MENU_PATHS] } },
      ],
    },
  });
}

async function deleteRemovedPermissions() {
  await prisma.permission.deleteMany({
    where: { slug: { in: [...REMOVED_PERMISSION_SLUGS] } },
  });
}

async function deleteRemovedEndpoints() {
  await prisma.endpoint.deleteMany({
    where: { slug: { in: [...REMOVED_ENDPOINT_SLUGS] } },
  });
}

async function seedAdminRolePermissions(permissionIds: string[]) {
  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } });
  if (!adminRole) return;

  const result = await ensureRolePermissions(adminRole.id, permissionIds, { addMissing: true });
  if (result.initialized) {
    console.log(`[Seed] Administrator role granted ${result.applied} permissions`);
    return;
  }
  if (result.added > 0) {
    console.log(`[Seed] Administrator role gained ${result.added} new permission(s)`);
    return;
  }
  console.log("[Seed] Administrator role permissions left unchanged");
}

async function seedUserRolePermissions() {
  const userRole = await prisma.role.findUnique({ where: { slug: "user" } });
  if (!userRole) return;

  const permissions = await prisma.permission.findMany({
    where: {
      slug: {
        in: [
          "customer_dashboard.read",
          "customer_requests.read",
          "customer_requests.write",
          "customer_contracts.read",
          "customer_invoices.read",
          "customer_complaints.read",
          "customer_complaints.write",
          "devices.register",
        ],
      },
    },
    orderBy: { slug: "asc" },
  });

  const result = await ensureRolePermissions(
    userRole.id,
    permissions.map((permission) => permission.id),
  );

  if (result.skipped) {
    console.log("[Seed] User role permissions left unchanged");
    return;
  }

  console.log(`[Seed] User role granted ${result.applied} customer portal permissions`);
}

async function seedDriverRolePermissions() {
  const driverRole = await prisma.role.findUnique({ where: { slug: "driver" } });
  if (!driverRole) return;

  const permissions = await prisma.permission.findMany({
    where: {
      slug: { in: ["driver.vehicle", "driver.trip", "driver.upcoming", "driver.history", "driver.maintenance", "driver.fuel", "driver.location", "devices.register"] },
    },
    orderBy: { slug: "asc" },
  });

  const result = await ensureRolePermissions(
    driverRole.id,
    permissions.map((permission) => permission.id),
  );

  if (result.skipped) {
    console.log("[Seed] Driver role permissions left unchanged");
    return;
  }

  console.log(`[Seed] Driver role granted ${result.applied} driver API permissions`);
}

/** Re-assigns every default platform permission to the admin role. */
export async function restoreAdminRolePermissions() {
  const adminRole = await prisma.role.findUnique({ where: { slug: "admin" } });
  if (!adminRole) {
    throw new Error('Role with slug "admin" was not found. Run pnpm db:seed first.');
  }

  const permissions = await prisma.permission.findMany({
    where: {
      slug: { in: DEFAULT_PERMISSIONS.map((permission) => permission.slug) },
    },
    orderBy: { slug: "asc" },
  });

  await setRolePermissions(
    adminRole.id,
    permissions.map((permission) => permission.id),
  );

  return permissions.length;
}

export async function seedAccessControl() {
  const permissionIds = await seedPermissions();
  await seedMenus();
  await deleteRemovedMenus();
  await deleteRemovedEndpoints();
  await seedEndpoints();
  await deleteRemovedPermissions();
  await seedAdminRolePermissions(permissionIds);
  await seedUserRolePermissions();
  await seedDriverRolePermissions();
  await seedDriverShiftTemplates();
}

const DEFAULT_SHIFT_TEMPLATES = [
  { slug: "morning", name: "Morning", startTime: "06:00", endTime: "14:00", sortOrder: 10 },
  { slug: "afternoon", name: "Afternoon", startTime: "14:00", endTime: "22:00", sortOrder: 20 },
  { slug: "night", name: "Night", startTime: "22:00", endTime: "06:00", sortOrder: 30 },
] as const;

async function seedDriverShiftTemplates() {
  const existing = await prisma.driverShiftTemplate.count();
  if (existing > 0) {
    console.log("[Seed] Driver shift templates already present");
    return;
  }

  for (const template of DEFAULT_SHIFT_TEMPLATES) {
    await prisma.driverShiftTemplate.create({
      data: {
        slug: template.slug,
        name: template.name,
        startTime: template.startTime,
        endTime: template.endTime,
        sortOrder: template.sortOrder,
        active: true,
      },
    });
  }

  console.log(`[Seed] Driver shift templates created (${DEFAULT_SHIFT_TEMPLATES.length})`);
}
