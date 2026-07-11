/**
 * OpenAPI paths, tags, and schemas for fleet, notifications, dispatch, and audit APIs.
 * Merged into the main spec served at /api/docs (Scalar).
 */

export const extensionTags = [
  { name: "Notifications", description: "Email/SMS provider settings and message templates (admin only)" },
  { name: "Notification Delivery Logs", description: "History of sent, skipped, and failed notification deliveries (admin only)" },
  { name: "Audit Logs", description: "Platform audit trail (admin only)" },
  { name: "Vehicles", description: "Fleet vehicle registry and default driver assignment (admin only)" },
  { name: "Maintenance Work Types", description: "Configurable maintenance work categories used by vehicle maintenance logs (admin only)" },
  { name: "Admin Ride Requests", description: "Ride request review, dispatch, status management, and driver trip views." },
  { name: "Contracts", description: "Customer commercial agreements linked to fare plans and ride requests (admin only)" },
] as const;

const rideRequestStatusEnumDescriptions = {
  pending: "Submitted and waiting for admin review. Admin only; never returned by driver endpoints.",
  confirmed: "Approved and scheduled",
  in_progress: "Trip has started",
  completed: "Trip finished",
  cancelled: "Trip was cancelled",
} as const;

const rideRequestDriverStatusEnumDescriptions = {
  confirmed: rideRequestStatusEnumDescriptions.confirmed,
  in_progress: rideRequestStatusEnumDescriptions.in_progress,
  completed: rideRequestStatusEnumDescriptions.completed,
  cancelled: rideRequestStatusEnumDescriptions.cancelled,
} as const;

const rideRequestHistoryStatusEnumDescriptions = {
  completed: rideRequestStatusEnumDescriptions.completed,
  cancelled: rideRequestStatusEnumDescriptions.cancelled,
} as const;

const rideRequestUpcomingStatusEnumDescriptions = {
  confirmed: rideRequestStatusEnumDescriptions.confirmed,
  in_progress: rideRequestStatusEnumDescriptions.in_progress,
} as const;

export const extensionParameters = {
  RideRequestStatus: {
    name: "status",
    in: "query",
    description: "Filter ride requests by lifecycle status.",
    schema: {
      type: "string",
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
      "x-enumDescriptions": rideRequestStatusEnumDescriptions,
    },
  },
  RideRequestDriverHistoryStatus: {
    name: "status",
    in: "query",
    description: "Filter history trips by status. Omit to return both values.",
    schema: {
      type: "string",
      enum: ["completed", "cancelled"],
      "x-enumDescriptions": rideRequestHistoryStatusEnumDescriptions,
    },
  },
} as const;

export const extensionSchemas = {
  NotificationConfiguration: {
    type: "object",
    description: "Provider configuration for a notification channel. Credential values in `settings` are masked in responses.",
    properties: {
      id: { type: "string", format: "uuid" },
      channel: { type: "string", enum: ["email", "sms"] },
      is_enabled: { type: "boolean" },
      provider: { type: "string", nullable: true, example: "afrosms" },
      from_email: { type: "string", format: "email", nullable: true },
      from_name: { type: "string", nullable: true },
      reply_to: { type: "string", format: "email", nullable: true },
      sender_id: { type: "string", nullable: true },
      settings: { type: "object", additionalProperties: true },
      has_credentials: { type: "boolean", description: "Whether API credentials are stored for this channel" },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  NotificationTemplate: {
    type: "object",
    description:
      "Message template for a module event and channel. Body and subject may include placeholders such as `{{requester_name}}` or `{{applicant_name}}` depending on module.",
    properties: {
      id: { type: "string", format: "uuid" },
      module: { type: "string", enum: ["ride_requests", "user_registrations", "insurance", "inspection"] },
      event: {
        type: "string",
        description: "Module-specific event slug (e.g. `created`, `approved`, `assigned`)",
        example: "created",
      },
      channel: { type: "string", enum: ["email", "sms"] },
      recipient: { type: "string", enum: ["requester", "driver", "applicant", "fleet_manager"] },
      is_enabled: { type: "boolean" },
      subject: { type: "string", nullable: true, description: "Email subject (null for SMS)" },
      body: { type: "string" },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  NotificationDeliveryLog: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      status: { type: "string", enum: ["sent", "skipped", "failed"] },
      module: { type: "string", enum: ["ride_requests", "user_registrations", "insurance", "inspection"] },
      event: { type: "string" },
      channel: { type: "string", enum: ["email", "sms"] },
      recipient: { type: "string", enum: ["requester", "driver", "applicant", "fleet_manager"] },
      template_id: { type: "string", format: "uuid", nullable: true },
      entity_type: { type: "string", nullable: true, example: "ride_request" },
      entity_id: { type: "string", format: "uuid", nullable: true },
      recipient_contact: { type: "string", nullable: true, description: "Email address or phone number used" },
      subject: { type: "string", nullable: true },
      body_preview: { type: "string", nullable: true },
      error_message: { type: "string", nullable: true },
      is_test: { type: "boolean", description: "True when sent from the admin test panel" },
      created_at: { type: "string", format: "date-time" },
    },
  },
  NotificationTestDelivery: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["sent", "skipped", "failed"] },
      channel: { type: "string", enum: ["email", "sms"] },
      recipient_contact: { type: "string", nullable: true },
      error_message: { type: "string", nullable: true },
    },
  },
  AuditLog: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      action: {
        type: "string",
        enum: ["create", "update", "delete", "login", "logout", "assign", "revoke", "test"],
      },
      module: { type: "string", example: "vehicles" },
      entity_type: { type: "string", nullable: true },
      entity_id: { type: "string", format: "uuid", nullable: true },
      entity_label: { type: "string", nullable: true },
      summary: { type: "string", nullable: true },
      actor_user_id: { type: "string", format: "uuid", nullable: true },
      actor_email: { type: "string", format: "email", nullable: true },
      actor_name: { type: "string", nullable: true },
      ip_address: { type: "string", nullable: true },
      user_agent: { type: "string", nullable: true },
      created_at: { type: "string", format: "date-time" },
    },
  },
  VehicleDriverSummary: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      email: { type: "string", format: "email" },
      mobile_number: { type: "string" },
    },
  },
  VehicleDriverOption: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      name: { type: "string" },
      email: { type: "string", format: "email" },
      mobile_number: { type: "string" },
    },
  },
  VehicleTypeSummary: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      slug: { type: "string" },
      name: { type: "string" },
    },
  },
  VehicleClassSummary: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      slug: { type: "string" },
      name: { type: "string" },
    },
  },
  MaintenanceWorkTypeSummary: {
    type: "object",
    description: "Localized summary of a maintenance work type embedded on maintenance logs.",
    properties: {
      id: { type: "string", format: "uuid" },
      slug: { type: "string", example: "repair" },
      name: { type: "string", example: "Repair" },
    },
  },
  MaintenanceWorkTypeTranslation: {
    type: "object",
    required: ["locale", "name"],
    properties: {
      locale: { type: "string", example: "en" },
      name: { type: "string", example: "Repair" },
      description: { type: "string", nullable: true },
    },
  },
  MaintenanceWorkType: {
    type: "object",
    description:
      "Maintenance work category. `name` and `description` follow the request locale; detail responses may include a `translations` array.",
    properties: {
      id: { type: "string", format: "uuid" },
      slug: { type: "string", example: "repair" },
      name: { type: "string" },
      description: { type: "string", nullable: true },
      locale: { type: "string", example: "en" },
      is_active: { type: "boolean" },
      sort_order: { type: "integer" },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
      translations: {
        type: "array",
        items: { $ref: "#/components/schemas/MaintenanceWorkTypeTranslation" },
      },
    },
  },
  MaintenanceWorkTypeInput: {
    type: "object",
    required: ["translations"],
    properties: {
      translations: {
        type: "array",
        minItems: 1,
        items: { $ref: "#/components/schemas/MaintenanceWorkTypeTranslation" },
        description: "At least one translation is required, including English (`en`). Slug is generated from the English name.",
      },
      is_active: { type: "boolean", default: true },
      sort_order: { type: "integer", default: 0 },
    },
  },
  Vehicle: {
    type: "object",
    description:
      "Fleet vehicle. Default driver is set via `assigned_driver_user_id`. Changing driver assignment requires `vehicles.assign_driver` permission.",
    properties: {
      id: { type: "string", format: "uuid" },
      plate_number: { type: "string", example: "AA-1-31209" },
      chassis_number: { type: "string", nullable: true },
      vehicle_type_id: { type: "string", format: "uuid" },
      vehicle_type: { $ref: "#/components/schemas/VehicleTypeSummary" },
      vehicle_class_id: { type: "string", format: "uuid" },
      vehicle_class: { $ref: "#/components/schemas/VehicleClassSummary" },
      assigned_driver_user_id: { type: "string", format: "uuid", nullable: true },
      assigned_driver: {
        allOf: [{ $ref: "#/components/schemas/VehicleDriverSummary" }],
        nullable: true,
      },
      make: { type: "string", nullable: true },
      model: { type: "string", nullable: true },
      year: { type: "integer", nullable: true },
      status: { type: "string", enum: ["active", "maintenance", "retired"] },
      notes: { type: "string", nullable: true },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  VehicleInput: {
    type: "object",
    required: ["plate_number", "chassis_number", "vehicle_type_id", "vehicle_class_id"],
    properties: {
      plate_number: { type: "string", example: "AA-1-31209" },
      chassis_number: { type: "string" },
      vehicle_type_id: { type: "string", format: "uuid" },
      vehicle_class_id: { type: "string", format: "uuid" },
      assigned_driver_user_id: {
        type: "string",
        format: "uuid",
        nullable: true,
        description: "Requires `vehicles.assign_driver` permission when setting a driver",
      },
      make: { type: "string", nullable: true },
      model: { type: "string", nullable: true },
      year: { type: "integer", nullable: true },
      status: { type: "string", enum: ["active", "maintenance", "retired"] },
      notes: { type: "string", nullable: true },
    },
  },
  VehicleMaintenanceLog: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      vehicle_id: { type: "string", format: "uuid" },
      work_type_id: { type: "string", format: "uuid" },
      work_type: { $ref: "#/components/schemas/MaintenanceWorkTypeSummary" },
      type: {
        type: "string",
        deprecated: true,
        description: "Slug alias of `work_type` for backward compatibility.",
        example: "repair",
      },
      status: {
        type: "string",
        enum: ["open", "in_progress", "completed", "cancelled"],
      },
      title: { type: "string" },
      description: { type: "string", nullable: true },
      vendor: { type: "string", nullable: true },
      cost_amount: { type: "number", nullable: true },
      odometer_km: { type: "number", nullable: true },
      started_at: { type: "string", format: "date", nullable: true },
      completed_at: { type: "string", format: "date", nullable: true },
      next_due_at: { type: "string", format: "date", nullable: true },
      next_due_km: { type: "number", nullable: true },
      created_by_user_id: { type: "string", format: "uuid", nullable: true },
      created_by: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
      },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  VehicleMaintenanceWorkTypeInput: {
    type: "object",
    description:
      "Identify the maintenance work type using one of `work_type_id`, `work_type_slug`, or legacy `type` (slug alias). The referenced work type must be active.",
    properties: {
      work_type_id: {
        type: "string",
        format: "uuid",
        description: "Preferred. UUID of an active maintenance work type.",
      },
      work_type_slug: {
        type: "string",
        example: "repair",
        description: "Slug of an active maintenance work type.",
      },
      type: {
        type: "string",
        deprecated: true,
        example: "repair",
        description: "Legacy alias for `work_type_slug`.",
      },
    },
  },
  VehicleMaintenanceInput: {
    allOf: [
      { $ref: "#/components/schemas/VehicleMaintenanceWorkTypeInput" },
      {
        type: "object",
        required: ["title"],
        properties: {
          status: {
            type: "string",
            enum: ["open", "in_progress", "completed", "cancelled"],
            default: "open",
          },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          vendor: { type: "string", nullable: true },
          cost_amount: { type: "number", nullable: true },
          odometer_km: { type: "number", nullable: true },
          started_at: { type: "string", format: "date", nullable: true },
          completed_at: { type: "string", format: "date", nullable: true },
          next_due_at: { type: "string", format: "date", nullable: true },
          next_due_km: { type: "number", nullable: true },
        },
      },
    ],
  },
  VehicleMaintenanceUpdateInput: {
    allOf: [
      { $ref: "#/components/schemas/VehicleMaintenanceWorkTypeInput" },
      {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["open", "in_progress", "completed", "cancelled"],
          },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          vendor: { type: "string", nullable: true },
          cost_amount: { type: "number", nullable: true },
          odometer_km: { type: "number", nullable: true },
          started_at: { type: "string", format: "date", nullable: true },
          completed_at: { type: "string", format: "date", nullable: true },
          next_due_at: { type: "string", format: "date", nullable: true },
          next_due_km: { type: "number", nullable: true },
        },
      },
    ],
  },
  DriverVehicleMaintenanceInput: {
    allOf: [
      { $ref: "#/components/schemas/VehicleMaintenanceWorkTypeInput" },
      {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["open", "in_progress", "completed", "cancelled"],
            default: "open",
          },
          title: {
            type: "string",
            description: "Optional. When omitted, the title is derived from the selected work type name.",
          },
          description: { type: "string", nullable: true },
          vendor: { type: "string", nullable: true },
          cost_amount: { type: "number", nullable: true },
          odometer_km: { type: "number", nullable: true },
          started_at: { type: "string", format: "date", nullable: true },
          completed_at: { type: "string", format: "date", nullable: true },
          next_due_at: { type: "string", format: "date", nullable: true },
          next_due_km: { type: "number", nullable: true },
        },
      },
    ],
  },
  DriverVehicleMaintenanceUpdateInput: {
    allOf: [
      { $ref: "#/components/schemas/VehicleMaintenanceWorkTypeInput" },
      {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["open", "in_progress", "completed", "cancelled"],
          },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          vendor: { type: "string", nullable: true },
          cost_amount: { type: "number", nullable: true },
          odometer_km: { type: "number", nullable: true },
          started_at: { type: "string", format: "date", nullable: true },
          completed_at: { type: "string", format: "date", nullable: true },
          next_due_at: { type: "string", format: "date", nullable: true },
          next_due_km: { type: "number", nullable: true },
        },
      },
    ],
  },
  VehicleFuelLog: {
    type: "object",
    description:
      "Fuel refill log for a vehicle. `price_per_liter`, `distance_since_last_km`, and `consumption_km_per_liter` are derived when the log is returned.",
    properties: {
      id: { type: "string", format: "uuid" },
      vehicle_id: { type: "string", format: "uuid" },
      logged_at: { type: "string", format: "date-time" },
      odometer_km: { type: "integer", minimum: 0 },
      quantity_liters: { type: "number", minimum: 0 },
      total_cost: { type: "number", nullable: true },
      price_per_liter: {
        type: "number",
        nullable: true,
        description: "Calculated as `total_cost / quantity_liters` when both values are present.",
      },
      fuel_type: { type: "string", enum: ["diesel", "petrol", "other"] },
      station_name: { type: "string", nullable: true },
      receipt_reference: { type: "string", nullable: true },
      source: { type: "string", enum: ["manual", "driver_app", "import"] },
      notes: { type: "string", nullable: true },
      distance_since_last_km: {
        type: "number",
        nullable: true,
        description: "Kilometers driven since the previous fuel log on this vehicle.",
      },
      consumption_km_per_liter: {
        type: "number",
        nullable: true,
        description: "Fuel efficiency derived from the previous odometer reading.",
      },
      created_by_user_id: { type: "string", format: "uuid", nullable: true },
      created_by: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
      },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  VehicleFuelInput: {
    type: "object",
    required: ["odometer_km", "quantity_liters", "total_cost", "station_name"],
    properties: {
      logged_at: {
        type: "string",
        format: "date-time",
        description: "Refill timestamp. Defaults to the current time when omitted.",
      },
      odometer_km: { type: "integer", minimum: 1, description: "Odometer reading in kilometers." },
      quantity_liters: { type: "number", minimum: 0, description: "Fuel quantity in liters." },
      total_cost: { type: "number", minimum: 0, description: "Total amount paid for the refill." },
      fuel_type: {
        type: "string",
        enum: ["diesel", "petrol", "other"],
        default: "diesel",
      },
      station_name: { type: "string", description: "Fuel station or vendor name." },
      receipt_reference: { type: "string", nullable: true },
      notes: { type: "string", nullable: true },
    },
  },
  VehicleFuelUpdateInput: {
    type: "object",
    properties: {
      logged_at: { type: "string", format: "date-time" },
      odometer_km: { type: "integer", minimum: 1 },
      quantity_liters: { type: "number", minimum: 0 },
      total_cost: { type: "number", minimum: 0 },
      fuel_type: { type: "string", enum: ["diesel", "petrol", "other"] },
      station_name: { type: "string" },
      receipt_reference: { type: "string", nullable: true },
      notes: { type: "string", nullable: true },
    },
  },
  ContractFarePlanSummary: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      slug: { type: "string" },
      name: { type: "string" },
      pricing_model: { type: "string", enum: ["flat", "distance", "time", "hybrid"] },
      currency: { type: "string" },
      base_fare: { type: "number" },
      is_active: { type: "boolean" },
    },
  },
  Contract: {
    type: "object",
    description: "Open commercial agreement with operational scope limits.",
    properties: {
      id: { type: "string", format: "uuid" },
      reference_number: {
        type: "string",
        example: "CTR-2026-0001",
        description: "Auto-generated as CTR-{year}-{####} when the contract is created.",
      },
      title: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "expired", "cancelled"] },
      fare_plan_id: { type: "string", format: "uuid", nullable: true },
      fare_plan: { allOf: [{ $ref: "#/components/schemas/ContractFarePlanSummary" }], nullable: true },
      notes: { type: "string", nullable: true },
      billing_interval: {
        type: "string",
        enum: ["per_trip", "monthly", "quarterly", "annually"],
      },
      payment_terms_days: { type: "integer", nullable: true },
      region_ids: { type: "array", items: { type: "string", format: "uuid" } },
      vehicle_type_ids: { type: "array", items: { type: "string", format: "uuid" } },
      vehicle_class_ids: { type: "array", items: { type: "string", format: "uuid" } },
      created_by_user_id: { type: "string", format: "uuid", nullable: true },
      created_by: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
      },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  ContractInput: {
    type: "object",
    required: ["title"],
    properties: {
      title: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "expired", "cancelled"], default: "draft" },
      fare_plan_id: { type: "string", format: "uuid", nullable: true },
      notes: { type: "string", nullable: true },
      billing_interval: {
        type: "string",
        enum: ["per_trip", "monthly", "quarterly", "annually"],
      },
      payment_terms_days: { type: "integer", nullable: true },
      region_ids: { type: "array", items: { type: "string", format: "uuid" } },
      vehicle_type_ids: { type: "array", items: { type: "string", format: "uuid" } },
      vehicle_class_ids: { type: "array", items: { type: "string", format: "uuid" } },
    },
  },
  ContractUpdateInput: {
    type: "object",
    properties: {
      title: { type: "string" },
      status: { type: "string", enum: ["draft", "active", "expired", "cancelled"] },
      fare_plan_id: { type: "string", format: "uuid", nullable: true },
      notes: { type: "string", nullable: true },
      billing_interval: {
        type: "string",
        enum: ["per_trip", "monthly", "quarterly", "annually"],
      },
      payment_terms_days: { type: "integer", nullable: true },
      region_ids: { type: "array", items: { type: "string", format: "uuid" } },
      vehicle_type_ids: { type: "array", items: { type: "string", format: "uuid" } },
      vehicle_class_ids: { type: "array", items: { type: "string", format: "uuid" } },
    },
  },
  AdminRideRequest: {
    type: "object",
    description: "Ride request as seen by admin dispatch. Driver is inherited from the assigned vehicle.",
    properties: {
      id: { type: "string", format: "uuid" },
      requester_user_id: { type: "string", format: "uuid" },
      pickup_address: { type: "string" },
      dropoff_address: { type: "string" },
      scheduled_at: { type: "string", format: "date-time", nullable: true },
      passenger_count: { type: "integer" },
      notes: { type: "string", nullable: true },
      status: { $ref: "#/components/schemas/RideRequestStatus" },
      rejection_reason: { type: "string", nullable: true },
      assigned_vehicle_id: { type: "string", format: "uuid", nullable: true },
      assigned_vehicle: { $ref: "#/components/schemas/Vehicle", nullable: true },
      assigned_driver_user_id: { type: "string", format: "uuid", nullable: true },
      assigned_driver: {
        allOf: [{ $ref: "#/components/schemas/VehicleDriverSummary" }],
        nullable: true,
      },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  DriverRideRequest: {
    type: "object",
    description:
      "Ride request as returned by driver trip endpoints. Only trips assigned to the authenticated driver are included, and `pending` is never returned because that status is admin review only.",
    properties: {
      id: { type: "string", format: "uuid" },
      requester_user_id: { type: "string", format: "uuid" },
      pickup_address: { type: "string" },
      dropoff_address: { type: "string" },
      scheduled_at: { type: "string", format: "date-time", nullable: true },
      passenger_count: { type: "integer" },
      notes: { type: "string", nullable: true },
      status: { $ref: "#/components/schemas/RideRequestDriverStatus" },
      rejection_reason: { type: "string", nullable: true },
      assigned_vehicle_id: { type: "string", format: "uuid", nullable: true },
      assigned_vehicle: { $ref: "#/components/schemas/Vehicle", nullable: true },
      assigned_driver_user_id: { type: "string", format: "uuid", nullable: true },
      assigned_driver: {
        allOf: [{ $ref: "#/components/schemas/VehicleDriverSummary" }],
        nullable: true,
      },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  RideRequestStatus: {
    type: "string",
    enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
    description: "Full ride request lifecycle status for admin APIs.",
    "x-enumDescriptions": rideRequestStatusEnumDescriptions,
  },
  RideRequestDriverStatus: {
    type: "string",
    enum: ["confirmed", "in_progress", "completed", "cancelled"],
    description: "Statuses exposed to drivers after admin review and assignment. `pending` is excluded.",
    "x-enumDescriptions": rideRequestDriverStatusEnumDescriptions,
  },
  RideRequestHistoryStatus: {
    type: "string",
    enum: ["completed", "cancelled"],
    description: "Past-trip status filter for driver history.",
    "x-enumDescriptions": rideRequestHistoryStatusEnumDescriptions,
  },
  RideRequestUpcomingStatus: {
    type: "string",
    enum: ["confirmed", "in_progress"],
    description: "Active trip statuses returned by the driver upcoming endpoint.",
    "x-enumDescriptions": rideRequestUpcomingStatusEnumDescriptions,
  },
} as const;

const security = [{ bearerAuth: [] }] as const;
const unauthorized = { $ref: "#/components/responses/Unauthorized" } as const;
const forbidden = { $ref: "#/components/responses/Forbidden" } as const;
const notFound = { $ref: "#/components/responses/NotFound" } as const;
const badRequest = { $ref: "#/components/responses/BadRequest" } as const;

export const extensionPaths = {
  "/api/notifications/templates": {
    get: {
      tags: ["Notifications"],
      summary: "List notification templates",
      description:
        "Returns all message templates, optionally filtered by module (`ride_requests`, `user_registrations`, `insurance`, or `inspection`). Templates are grouped by module, event, channel, and recipient in the admin UI.",
      security,
      parameters: [
        {
          name: "module",
          in: "query",
          schema: { type: "string", enum: ["ride_requests", "user_registrations", "insurance", "inspection"] },
          description: "Filter templates for a single module",
        },
      ],
      responses: {
        "200": {
          description: "Template list",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      templates: {
                        type: "array",
                        items: { $ref: "#/components/schemas/NotificationTemplate" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
      },
    },
    put: {
      tags: ["Notifications"],
      summary: "Update notification templates",
      description:
        "Batch update template `is_enabled`, `subject`, and `body` fields. Unknown placeholders in subject/body are rejected. Each item must include the template `id`.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["templates"],
              properties: {
                templates: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["id"],
                    properties: {
                      id: { type: "string", format: "uuid" },
                      is_enabled: { type: "boolean" },
                      subject: { type: "string", nullable: true },
                      body: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated templates",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      templates: {
                        type: "array",
                        items: { $ref: "#/components/schemas/NotificationTemplate" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/notifications/templates/{id}/test": {
    post: {
      tags: ["Notifications"],
      summary: "Send test notification for a template",
      description:
        "Renders the template with sample placeholder data and sends to the provided recipient. Logs the attempt in notification delivery logs with `is_test: true`.",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                to: {
                  type: "string",
                  description: "Email address or phone number. Uses admin profile contact when omitted.",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Test delivery result",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      delivery: { $ref: "#/components/schemas/NotificationTestDelivery" },
                    },
                  },
                  message: { type: "string", example: "Test notification sent successfully." },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/notifications/{channel}": {
    get: {
      tags: ["Notifications"],
      summary: "Get notification channel configuration",
      description: "Returns email or SMS provider settings. Sensitive credential fields are masked.",
      security,
      parameters: [
        {
          name: "channel",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["email", "sms"] },
        },
      ],
      responses: {
        "200": {
          description: "Channel configuration",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      configuration: { $ref: "#/components/schemas/NotificationConfiguration" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    patch: {
      tags: ["Notifications"],
      summary: "Update notification channel configuration",
      description: "Upserts email or SMS provider settings. SMS currently supports AfroSMS only.",
      security,
      parameters: [
        {
          name: "channel",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["email", "sms"] },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                is_enabled: { type: "boolean" },
                provider: { type: "string", example: "afrosms" },
                from_email: { type: "string", format: "email", nullable: true },
                from_name: { type: "string", nullable: true },
                reply_to: { type: "string", format: "email", nullable: true },
                sender_id: { type: "string", nullable: true },
                settings: { type: "object", additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated configuration",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      configuration: { $ref: "#/components/schemas/NotificationConfiguration" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/notifications/{channel}/test": {
    post: {
      tags: ["Notifications"],
      summary: "Send test SMS",
      description: "Sends a plain test SMS using the configured SMS provider. Email test uses template test endpoint instead.",
      security,
      parameters: [
        {
          name: "channel",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["sms"] },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["to"],
              properties: {
                to: { type: "string", description: "Recipient phone number" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Test SMS result",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      delivery: { $ref: "#/components/schemas/NotificationTestDelivery" },
                    },
                  },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/notification-delivery-logs": {
    get: {
      tags: ["Notification Delivery Logs"],
      summary: "List notification delivery logs",
      description: "Paginated history of notification send attempts including production dispatches and admin tests.",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search recipient contact, subject, or error message",
        },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["sent", "skipped", "failed"] },
        },
        {
          name: "module",
          in: "query",
          schema: { type: "string", enum: ["ride_requests", "user_registrations", "insurance", "inspection"] },
        },
        {
          name: "channel",
          in: "query",
          schema: { type: "string", enum: ["email", "sms"] },
        },
        { name: "event", in: "query", schema: { type: "string" } },
        { name: "is_test", in: "query", schema: { type: "boolean" } },
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
      ],
      responses: {
        "200": {
          description: "Paginated delivery logs",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/NotificationDeliveryLog" },
                  },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/notification-delivery-logs/{id}": {
    get: {
      tags: ["Notification Delivery Logs"],
      summary: "Get notification delivery log",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Delivery log entry",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      delivery_log: { $ref: "#/components/schemas/NotificationDeliveryLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/audit-logs": {
    get: {
      tags: ["Audit Logs"],
      summary: "List audit logs",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "module", in: "query", schema: { type: "string" } },
        {
          name: "action",
          in: "query",
          schema: {
            type: "string",
            enum: ["create", "update", "delete", "login", "logout", "assign", "revoke", "test"],
          },
        },
        { name: "actor_user_id", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "entity_type", in: "query", schema: { type: "string" } },
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
      ],
      responses: {
        "200": {
          description: "Paginated audit logs",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: { type: "array", items: { $ref: "#/components/schemas/AuditLog" } },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/audit-logs/{id}": {
    get: {
      tags: ["Audit Logs"],
      summary: "Get audit log entry",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Audit log details",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      audit_log: { $ref: "#/components/schemas/AuditLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/vehicles": {
    get: {
      tags: ["Vehicles"],
      summary: "List vehicles",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { $ref: "#/components/parameters/Locale" },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "vehicle_type_id", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "vehicle_class_id", in: "query", schema: { type: "string", format: "uuid" } },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["active", "maintenance", "retired"] },
        },
        { name: "assigned_driver_user_id", in: "query", schema: { type: "string", format: "uuid" } },
        { name: "unassigned_only", in: "query", schema: { type: "boolean" } },
        { name: "assigned_only", in: "query", schema: { type: "boolean" } },
      ],
      responses: {
        "200": {
          description: "Paginated vehicle list",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: { type: "array", items: { $ref: "#/components/schemas/Vehicle" } },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
      },
    },
    post: {
      tags: ["Vehicles"],
      summary: "Create vehicle",
      description: "Requires `vehicles.write`. Setting `assigned_driver_user_id` additionally requires `vehicles.assign_driver`.",
      security,
      parameters: [{ $ref: "#/components/parameters/Locale" }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VehicleInput" },
          },
        },
      },
      responses: {
        "201": {
          description: "Vehicle created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: { vehicle: { $ref: "#/components/schemas/Vehicle" } },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/vehicles/driver-options": {
    get: {
      tags: ["Vehicles"],
      summary: "List assignable drivers",
      description:
        "Returns active driver accounts for the vehicle driver assignment UI. Requires `vehicles.assign_driver` permission.",
      security,
      parameters: [
        { name: "search", in: "query", schema: { type: "string" }, description: "Search name, email, or mobile" },
      ],
      responses: {
        "200": {
          description: "Driver options",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      drivers: {
                        type: "array",
                        items: { $ref: "#/components/schemas/VehicleDriverOption" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/vehicles/{id}": {
    get: {
      tags: ["Vehicles"],
      summary: "Get vehicle",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      responses: {
        "200": {
          description: "Vehicle details",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: { vehicle: { $ref: "#/components/schemas/Vehicle" } },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    patch: {
      tags: ["Vehicles"],
      summary: "Update vehicle",
      description:
        "Requires `vehicles.write`. Changing `assigned_driver_user_id` requires `vehicles.assign_driver`. A driver can only be linked to one vehicle at a time.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              allOf: [
                { $ref: "#/components/schemas/VehicleInput" },
                {
                  type: "object",
                  description: "All fields optional on update",
                  required: [],
                },
              ],
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Vehicle updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: { vehicle: { $ref: "#/components/schemas/Vehicle" } },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    delete: {
      tags: ["Vehicles"],
      summary: "Delete vehicle",
      description: "Requires `vehicles.delete`.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Vehicle deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: { $ref: "#/components/schemas/MessageResponse" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/vehicles/{id}/maintenance": {
    get: {
      tags: ["Vehicles"],
      summary: "List vehicle maintenance logs",
      description:
        "Returns paginated maintenance logs for a vehicle. Each log includes the resolved `work_type` summary.\n\n" +
        "- Permission: `vehicles.read`",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { $ref: "#/components/parameters/Locale" },
        {
          name: "status",
          in: "query",
          required: false,
          schema: {
            type: "string",
            enum: ["open", "in_progress", "completed", "cancelled"],
          },
        },
      ],
      responses: {
        "200": {
          description: "Paginated maintenance logs",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/VehicleMaintenanceLog" },
                  },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    post: {
      tags: ["Vehicles"],
      summary: "Create vehicle maintenance log",
      description:
        "Creates a maintenance log on a vehicle.\n\n" +
        "- Permission: `vehicles.write`\n" +
        "- Requires a valid active work type via `work_type_id`, `work_type_slug`, or legacy `type`.\n" +
        "- Opening maintenance on an active vehicle can move that vehicle to `maintenance` status.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VehicleMaintenanceInput" },
          },
        },
      },
      responses: {
        "201": {
          description: "Maintenance log created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      maintenance_log: { $ref: "#/components/schemas/VehicleMaintenanceLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/vehicles/{id}/maintenance/{maintenanceId}": {
    patch: {
      tags: ["Vehicles"],
      summary: "Update vehicle maintenance log",
      description:
        "Updates a maintenance log on a vehicle. Work type can be changed by sending `work_type_id`, `work_type_slug`, or legacy `type`.\n\n" +
        "- Permission: `vehicles.write`",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        {
          name: "maintenanceId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        { $ref: "#/components/parameters/Locale" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VehicleMaintenanceUpdateInput" },
          },
        },
      },
      responses: {
        "200": {
          description: "Maintenance log updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      maintenance_log: { $ref: "#/components/schemas/VehicleMaintenanceLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/vehicles/{id}/fuel": {
    get: {
      tags: ["Vehicles"],
      summary: "List vehicle fuel logs",
      description:
        "Returns paginated fuel refill logs for a vehicle. Each log includes derived efficiency fields based on the previous log's odometer reading.\n\n" +
        "- Permission: `vehicles.read`",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
      ],
      responses: {
        "200": {
          description: "Paginated fuel logs",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/VehicleFuelLog" },
                  },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    post: {
      tags: ["Vehicles"],
      summary: "Create vehicle fuel log",
      description:
        "Creates a fuel refill log on a vehicle.\n\n" +
        "- Permission: `vehicles.write`\n" +
        "- `station_name` and `total_cost` are required.\n" +
        "- Logs created here use `source: manual` and append a `fuel_logged` vehicle history event.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VehicleFuelInput" },
          },
        },
      },
      responses: {
        "201": {
          description: "Fuel log created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      fuel_log: { $ref: "#/components/schemas/VehicleFuelLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/vehicles/{id}/fuel/{fuelLogId}": {
    patch: {
      tags: ["Vehicles"],
      summary: "Update vehicle fuel log",
      description:
        "Updates a fuel refill log on a vehicle.\n\n" +
        "- Permission: `vehicles.write`\n" +
        "- When provided, `station_name` and `total_cost` must be valid non-empty values.\n" +
        "- Appends a `fuel_updated` vehicle history event.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        {
          name: "fuelLogId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VehicleFuelUpdateInput" },
          },
        },
      },
      responses: {
        "200": {
          description: "Fuel log updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      fuel_log: { $ref: "#/components/schemas/VehicleFuelLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/maintenance-work-types/active": {
    get: {
      tags: ["Maintenance Work Types"],
      summary: "List active maintenance work types",
      description:
        "Returns active work types for maintenance forms. Used by admin vehicle maintenance UI and driver maintenance requests.\n\n" +
        "- Permission: `maintenance_work_types.read`, `vehicles.read`, or `driver.maintenance`",
      security,
      parameters: [{ $ref: "#/components/parameters/Locale" }],
      responses: {
        "200": {
          description: "Active work types",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      maintenance_work_types: {
                        type: "array",
                        items: { $ref: "#/components/schemas/MaintenanceWorkType" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/maintenance-work-types": {
    get: {
      tags: ["Maintenance Work Types"],
      summary: "List maintenance work types",
      description: "Paginated list of maintenance work types. Requires `maintenance_work_types.read`.",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { $ref: "#/components/parameters/Locale" },
        { name: "search", in: "query", schema: { type: "string" } },
        { name: "is_active", in: "query", schema: { type: "boolean" } },
      ],
      responses: {
        "200": {
          description: "Paginated work types",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/MaintenanceWorkType" },
                  },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
      },
    },
    post: {
      tags: ["Maintenance Work Types"],
      summary: "Create maintenance work type",
      description: "Requires `maintenance_work_types.write`. English (`en`) translation is required to generate the slug.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MaintenanceWorkTypeInput" },
          },
        },
      },
      responses: {
        "201": {
          description: "Work type created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      maintenance_work_type: { $ref: "#/components/schemas/MaintenanceWorkType" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/maintenance-work-types/{id}": {
    get: {
      tags: ["Maintenance Work Types"],
      summary: "Get maintenance work type",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      responses: {
        "200": {
          description: "Work type details",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      maintenance_work_type: { $ref: "#/components/schemas/MaintenanceWorkType" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    patch: {
      tags: ["Maintenance Work Types"],
      summary: "Update maintenance work type",
      description: "Requires `maintenance_work_types.write`.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/MaintenanceWorkTypeInput" },
          },
        },
      },
      responses: {
        "200": {
          description: "Work type updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      maintenance_work_type: { $ref: "#/components/schemas/MaintenanceWorkType" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    delete: {
      tags: ["Maintenance Work Types"],
      summary: "Delete maintenance work type",
      description:
        "Requires `maintenance_work_types.delete`. Returns 409 if the work type is referenced by maintenance logs.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      responses: {
        "200": {
          description: "Work type deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: { $ref: "#/components/schemas/MessageResponse" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
  },
  "/api/admin/ride-requests": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "List ride requests",
      description: "Admin view of all customer ride requests. Requires `ride_requests.read`.",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { $ref: "#/components/parameters/Locale" },
        { name: "search", in: "query", schema: { type: "string" } },
        { $ref: "#/components/parameters/RideRequestStatus" },
        { name: "upcoming", in: "query", schema: { type: "boolean" }, description: "Only scheduled future trips" },
      ],
      responses: {
        "200": {
          description: "Paginated ride requests",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: { type: "array", items: { $ref: "#/components/schemas/AdminRideRequest" } },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/admin/ride-requests/{id}": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "Get ride request",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      responses: {
        "200": {
          description: "Ride request details",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      ride_request: { $ref: "#/components/schemas/AdminRideRequest" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/admin/ride-requests/{id}/assignable-vehicles": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "List assignable vehicles for dispatch",
      description:
        "Returns active vehicles with an assigned driver that match the ride request type/class. Only available for confirmed requests (or when already assigned).",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
        { name: "search", in: "query", schema: { type: "string" }, description: "Filter by plate or driver" },
      ],
      responses: {
        "200": {
          description: "Assignable vehicles",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      vehicles: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Vehicle" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
  },
  "/api/admin/ride-requests/{id}/assign": {
    post: {
      tags: ["Admin Ride Requests"],
      summary: "Assign vehicle to ride request",
      description:
        "Assigns a fleet vehicle to a confirmed ride request. Driver is inherited from the vehicle's default driver. Requires `ride_requests.write`.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["vehicle_id"],
              properties: {
                vehicle_id: { type: "string", format: "uuid" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Ride request assigned",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      ride_request: { $ref: "#/components/schemas/AdminRideRequest" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
  },
  "/api/admin/ride-requests/{id}/unassign": {
    post: {
      tags: ["Admin Ride Requests"],
      summary: "Unassign vehicle from ride request",
      description: "Clears vehicle and driver assignment from a confirmed ride request.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      responses: {
        "200": {
          description: "Ride request unassigned",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      ride_request: { $ref: "#/components/schemas/AdminRideRequest" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
  },
  "/api/admin/ride-requests/{id}/status": {
    post: {
      tags: ["Admin Ride Requests"],
      summary: "Update ride request status",
      description:
        "Admin workflow actions: `confirm`, `reject`, `start`, or `complete`. Reject accepts optional `rejection_reason`. Triggers notification templates when configured.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["action"],
              properties: {
                action: {
                  type: "string",
                  enum: ["confirm", "reject", "start", "complete"],
                },
                rejection_reason: { type: "string", nullable: true },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated ride request",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      ride_request: { $ref: "#/components/schemas/AdminRideRequest" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
  },
  "/api/contracts": {
    get: {
      tags: ["Contracts"],
      summary: "List customer contracts",
      description: "Requires `contracts.read`.",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { $ref: "#/components/parameters/Locale" },
        { name: "search", in: "query", schema: { type: "string" }, description: "Search reference number or title" },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["draft", "active", "expired", "cancelled"] },
        },
      ],
      responses: {
        "200": {
          description: "Paginated contract list",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: { type: "array", items: { $ref: "#/components/schemas/Contract" } },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
      },
    },
    post: {
      tags: ["Contracts"],
      summary: "Create customer contract",
      description: "Requires `contracts.write`.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ContractInput" },
          },
        },
      },
      responses: {
        "201": {
          description: "Contract created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: { contract: { $ref: "#/components/schemas/Contract" } },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
  },
  "/api/contracts/{id}": {
    get: {
      tags: ["Contracts"],
      summary: "Get customer contract",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      responses: {
        "200": {
          description: "Contract details",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      contract: { $ref: "#/components/schemas/Contract" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    patch: {
      tags: ["Contracts"],
      summary: "Update customer contract",
      description: "Requires `contracts.write`.",
      security,
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        { $ref: "#/components/parameters/Locale" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ContractUpdateInput" },
          },
        },
      },
      responses: {
        "200": {
          description: "Contract updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: { contract: { $ref: "#/components/schemas/Contract" } },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
    delete: {
      tags: ["Contracts"],
      summary: "Delete customer contract",
      description: "Requires `contracts.delete`. Fails with 409 when linked ride requests exist.",
      security,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": {
          description: "Contract deleted",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: { message: { type: "string" } },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
  },
  "/api/ride-requests/driver/vehicle": {
    get: {
      tags: ["Vehicles"],
      summary: "Get vehicle assigned to driver",
      description:
        "Returns the fleet vehicle whose `assigned_driver_user_id` matches the authenticated user. Used by the driver app to show their primary vehicle.",
      security,
      responses: {
        "200": {
          description: "Assigned vehicle or null",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      vehicle: { $ref: "#/components/schemas/Vehicle", nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
        "401": unauthorized,
      },
    },
  },
  "/api/ride-requests/driver/upcoming": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "Driver upcoming trips",
      description:
        "Lists rides where the authenticated user is the assigned driver. Only trips with upcoming driver statuses are returned. `pending` is never included because that status is admin review only.\n\n" +
        "**Socket.IO (real-time):** connect to namespace `/api/ride-requests/driver/upcoming` for live upcoming-trip updates.\n\n" +
        "- URL: `http://{host}` with namespace `/api/ride-requests/driver/upcoming`\n" +
        "- Auth: `auth: { token: \"{access_token}\" }` on connect, or `Authorization: Bearer {access_token}` header\n" +
        "- Permission: `driver.upcoming`\n" +
        "- Localized fields include a `translations` array with all languages (`en`, `am`, ...).\n\n" +
        "Server events:\n" +
        "- `snapshot`: full upcoming trip list sent on connect\n" +
        "- `trip_added`: trip entered the driver's upcoming list\n" +
        "- `trip_updated`: assigned upcoming trip changed\n" +
        "- `trip_removed`: trip left the upcoming list\n" +
        "- `pong`: heartbeat response\n" +
        "- `error`: connection or message error\n\n" +
        "Client events:\n" +
        "- `ping`\n" +
        "- `refresh` reload snapshot",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { $ref: "#/components/parameters/Locale" },
      ],
      responses: {
        "200": {
          description: "Paginated upcoming trips for driver",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: { type: "array", items: { $ref: "#/components/schemas/DriverRideRequest" } },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
      },
    },
  },
  "/api/ride-requests/driver/history": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "Driver trip history",
      description:
        "Lists past rides where the authenticated user is the assigned driver. Use the `status` query parameter to filter by trip status. `pending` is never included because that status is admin review only.",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { $ref: "#/components/parameters/Locale" },
        { $ref: "#/components/parameters/RideRequestDriverHistoryStatus" },
      ],
      responses: {
        "200": {
          description: "Paginated past trips for driver",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: { type: "array", items: { $ref: "#/components/schemas/DriverRideRequest" } },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
      },
    },
  },
  "/api/ride-requests/driver/maintenance": {
    get: {
      tags: ["Vehicles"],
      summary: "List maintenance logs for driver's assigned vehicle",
      description:
        "Lists maintenance logs for the vehicle assigned to the authenticated driver. Each log includes the resolved `work_type` summary.\n\n" +
        "- Permission: `driver.maintenance`\n" +
        "- Returns 404 if the driver has no assigned vehicle.",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { $ref: "#/components/parameters/Locale" },
        {
          name: "status",
          in: "query",
          required: false,
          schema: {
            type: "string",
            enum: ["open", "in_progress", "completed", "cancelled"],
          },
        },
      ],
      responses: {
        "200": {
          description: "Paginated maintenance logs",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/VehicleMaintenanceLog" },
                  },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    post: {
      tags: ["Vehicles"],
      summary: "Request maintenance for driver's assigned vehicle",
      description:
        "Creates a maintenance log on the vehicle assigned to the authenticated driver.\n\n" +
        "- Permission: `driver.maintenance`\n" +
        "- Requires a valid active work type via `work_type_id`, `work_type_slug`, or legacy `type`.\n" +
        "- If `title` is omitted, it is derived from the selected work type name.\n" +
        "- Opening an active vehicle can move that vehicle to `maintenance` status.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/DriverVehicleMaintenanceInput" },
          },
        },
      },
      responses: {
        "201": {
          description: "Maintenance log created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      maintenance_log: { $ref: "#/components/schemas/VehicleMaintenanceLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/ride-requests/driver/maintenance/{maintenanceId}": {
    patch: {
      tags: ["Vehicles"],
      summary: "Update maintenance log on driver's assigned vehicle",
      description:
        "Updates a maintenance log that belongs to the vehicle assigned to the authenticated driver. Work type can be changed by sending `work_type_id`, `work_type_slug`, or legacy `type`.\n\n" +
        "- Permission: `driver.maintenance`",
      security,
      parameters: [
        {
          name: "maintenanceId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/DriverVehicleMaintenanceUpdateInput" },
          },
        },
      },
      responses: {
        "200": {
          description: "Maintenance log updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      maintenance_log: { $ref: "#/components/schemas/VehicleMaintenanceLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/ride-requests/driver/fuel": {
    get: {
      tags: ["Vehicles"],
      summary: "List fuel logs for driver's assigned vehicle",
      description:
        "Lists fuel refill logs for the vehicle assigned to the authenticated driver. Each log includes derived efficiency fields based on the previous log's odometer reading.\n\n" +
        "- Permission: `driver.fuel`\n" +
        "- Returns 404 if the driver has no assigned vehicle.",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
      ],
      responses: {
        "200": {
          description: "Paginated fuel logs",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/VehicleFuelLog" },
                  },
                  pagination: { $ref: "#/components/schemas/PaginationMeta" },
                },
              },
            },
          },
        },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    post: {
      tags: ["Vehicles"],
      summary: "Log fuel refill for driver's assigned vehicle",
      description:
        "Creates a fuel refill log on the vehicle assigned to the authenticated driver.\n\n" +
        "- Permission: `driver.fuel`\n" +
        "- `station_name` and `total_cost` are required.\n" +
        "- Logs created here use `source: driver_app` and append a `fuel_logged` vehicle history event.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VehicleFuelInput" },
          },
        },
      },
      responses: {
        "201": {
          description: "Fuel log created",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      fuel_log: { $ref: "#/components/schemas/VehicleFuelLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/ride-requests/driver/fuel/{fuelLogId}": {
    patch: {
      tags: ["Vehicles"],
      summary: "Update fuel log on driver's assigned vehicle",
      description:
        "Updates a fuel refill log that belongs to the vehicle assigned to the authenticated driver.\n\n" +
        "- Permission: `driver.fuel`\n" +
        "- When provided, `station_name` and `total_cost` must be valid non-empty values.",
      security,
      parameters: [
        {
          name: "fuelLogId",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/VehicleFuelUpdateInput" },
          },
        },
      },
      responses: {
        "200": {
          description: "Fuel log updated",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      fuel_log: { $ref: "#/components/schemas/VehicleFuelLog" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
} as const;
