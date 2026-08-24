/**
 * OpenAPI paths, tags, and schemas for fleet, notifications, dispatch, and audit APIs.
 * Merged into the main spec served at /api/docs (Scalar).
 */

export const extensionTags = [
  {
    name: "Notifications",
    description:
      "Email/SMS provider settings, push broadcasts, and message templates (admin only)",
  },
  {
    name: "Devices",
    description:
      "Mobile device token registration for FCM push notifications (authenticated users)",
  },
  {
    name: "System Settings",
    description:
      "Configurable platform settings such as deadline configurations (admin only)",
  },
  {
    name: "Notification Delivery Logs",
    description:
      "History of sent, skipped, and failed notification deliveries (admin only)",
  },
  { name: "Audit Logs", description: "Platform audit trail (admin only)" },
  {
    name: "Vehicles",
    description:
      "Fleet vehicle registry and default driver assignment (admin only)",
  },
  {
    name: "Maintenance Work Types",
    description:
      "Configurable maintenance work categories used by vehicle maintenance logs (admin only)",
  },
  {
    name: "Driver Attendance",
    description: "Daily driver attendance roster, check-in/out, and leave records (admin only)",
  },
  {
    name: "Driver Shifts",
    description: "Named work shifts and daily driver roster assignments (admin only)",
  },
  {
    name: "Dispatch",
    description: "Dispatcher working board: assignment queues, live trips, fleet availability, and open complaints.",
  },
  {
    name: "Admin Ride Requests",
    description:
      "Ride request review, dispatch, status management, and driver trip views.",
  },
  {
    name: "Realtime",
    description:
      "Unified Socket.IO namespace `/api/ws` for live driver trips, vehicle location, and future realtime events.",
  },
  {
    name: "Contracts",
    description:
      "Customer commercial agreements linked to fare plans and ride requests (admin only)",
  },
  {
    name: "Business TIN",
    description: "Look up Ethiopian business TIN registration details via eTrade.",
  },
] as const;

const rideRequestStatusEnumDescriptions = {
  pending:
    "Submitted and waiting for admin review. Admin only; never returned by driver endpoints.",
  confirmed: "Approved and scheduled",
  in_progress: "Trip has started",
  completed: "Trip finished",
  cancelled: "Trip was cancelled",
  no_show: "Passenger did not show up for the trip",
} as const;

const rideRequestDriverStatusEnumDescriptions = {
  confirmed: rideRequestStatusEnumDescriptions.confirmed,
  in_progress: rideRequestStatusEnumDescriptions.in_progress,
  completed: rideRequestStatusEnumDescriptions.completed,
  cancelled: rideRequestStatusEnumDescriptions.cancelled,
  no_show: rideRequestStatusEnumDescriptions.no_show,
} as const;

const rideRequestHistoryStatusEnumDescriptions = {
  completed: rideRequestStatusEnumDescriptions.completed,
  cancelled: rideRequestStatusEnumDescriptions.cancelled,
  no_show: rideRequestStatusEnumDescriptions.no_show,
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
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"],
      "x-enumDescriptions": rideRequestStatusEnumDescriptions,
    },
  },
  RideRequestDriverHistoryStatus: {
    name: "status",
    in: "query",
    description: "Filter history trips by status. Omit to return both values.",
    schema: {
      type: "string",
      enum: ["completed", "cancelled", "no_show"],
      "x-enumDescriptions": rideRequestHistoryStatusEnumDescriptions,
    },
  },
} as const;

export const extensionSchemas = {
  CustomerPaymentOptions: {
    type: "object",
    properties: {
      methods: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            kind: { type: "string", enum: ["telebirr", "cbe_birr", "custom"] },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            enabled: { type: "boolean" },
            sort_order: { type: "integer" },
            logo_url: { type: "string", nullable: true },
            fields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  label: { type: "string" },
                  value: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
  BusinessTinLicense: {
    type: "object",
    properties: {
      license_no: { type: "string", example: "AK/AA/14/671/642182/2009" },
      main_guid: { type: "string", format: "uuid", nullable: true },
      business_name: { type: "string", example: "TEWODROS SHIFRAW AMEDE" },
      legal_status: { type: "string", nullable: true, example: "1" },
      issued_date: { type: "string", nullable: true, example: "2/6/2009" },
      expiry_date: { type: "string", nullable: true, example: "30/10/2009" },
    },
  },
  BusinessTinRegistration: {
    type: "object",
    properties: {
      tin: { type: "string", example: "1111111111" },
      owner_name: { type: "string", example: "TEWODROS SHIFRAW AMEDE" },
      licenses: {
        type: "array",
        items: { $ref: "#/components/schemas/BusinessTinLicense" },
      },
    },
  },
  BusinessLicenseAddress: {
    type: "object",
    properties: {
      region: { type: "string", nullable: true },
      zone: { type: "string", nullable: true },
      woreda: { type: "string", nullable: true },
      kebele: { type: "string", nullable: true },
      house_no: { type: "string", nullable: true },
      mobile_phone: { type: "string", nullable: true },
      regular_phone: { type: "string", nullable: true },
    },
  },
  BusinessLicenseSubGroup: {
    type: "object",
    properties: {
      code: { type: "integer", nullable: true, example: 71114 },
      description: { type: "string", nullable: true },
    },
  },
  BusinessLicenseDetail: {
    type: "object",
    properties: {
      main_guid: { type: "string", format: "uuid", nullable: true },
      owner_tin: { type: "string", example: "1111111111" },
      date_registered: { type: "string", nullable: true, example: "2/6/2009" },
      trade_name: { type: "string", nullable: true },
      license_no: { type: "string", example: "AK/AA/14/671/642182/2009" },
      status: { type: "integer", nullable: true, example: 6 },
      status_description: { type: "string", nullable: true, example: "Closed" },
      capital: { type: "number", nullable: true, example: 383707 },
      associates: { type: "array", items: { type: "object", additionalProperties: true } },
      address: { $ref: "#/components/schemas/BusinessLicenseAddress", nullable: true },
      sub_groups: {
        type: "array",
        items: { $ref: "#/components/schemas/BusinessLicenseSubGroup" },
      },
      renewed_to: { type: "string", nullable: true },
      renewed_to_date_string: { type: "string", nullable: true },
      renewal_date: { type: "string", nullable: true },
      renewed_from: { type: "string", nullable: true },
      cancellation_date: { type: "string", nullable: true },
    },
  },
  NotificationConfiguration: {
    type: "object",
    description:
      "Provider configuration for a notification channel. Credential values in `settings` are masked in responses.",
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
      has_credentials: {
        type: "boolean",
        description: "Whether API credentials are stored for this channel",
      },
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
      module: {
        type: "string",
        enum: [
          "ride_requests",
          "user_registrations",
          "insurance",
          "inspection",
        ],
      },
      event: {
        type: "string",
        description:
          "Module-specific event slug (e.g. `created`, `approved`, `assigned`)",
        example: "created",
      },
      channel: { type: "string", enum: ["email", "sms", "push"] },
      recipient: {
        type: "string",
        enum: ["requester", "driver", "applicant", "fleet_manager", "account_holder", "dispatcher", "supervisor"],
      },
      is_enabled: { type: "boolean" },
      subject: {
        type: "string",
        nullable: true,
        description: "Email subject or push title (null for SMS)",
      },
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
      module: {
        type: "string",
        enum: [
          "ride_requests",
          "user_registrations",
          "insurance",
          "inspection",
          "invoices",
          "password_reset",
          "system",
        ],
      },
      event: { type: "string" },
      channel: { type: "string", enum: ["email", "sms", "push"] },
      recipient: {
        type: "string",
        enum: ["requester", "driver", "applicant", "fleet_manager", "account_holder", "dispatcher", "supervisor"],
      },
      template_id: { type: "string", format: "uuid", nullable: true },
      entity_type: { type: "string", nullable: true, example: "ride_request" },
      entity_id: { type: "string", format: "uuid", nullable: true },
      recipient_contact: {
        type: "string",
        nullable: true,
        description: "Email address, phone number, or push target (e.g. user-{id})",
      },
      subject: { type: "string", nullable: true },
      body_preview: { type: "string", nullable: true },
      error_message: { type: "string", nullable: true },
      is_test: {
        type: "boolean",
        description: "True when sent from the admin test panel",
      },
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
  RegisteredDeviceToken: {
    type: "object",
    description:
      "FCM device registration returned by the external notification service after token upsert.",
    properties: {
      id: { type: "string", format: "uuid" },
      clientId: {
        type: "string",
        description: "Push target for this user, in the form `user-{userId}`.",
        example: "user-abc123",
      },
      platform: { type: "string", enum: ["android", "ios"] },
      isActive: { type: "boolean" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
  },
  AuditLog: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      action: {
        type: "string",
        enum: [
          "create",
          "update",
          "delete",
          "login",
          "logout",
          "assign",
          "revoke",
          "test",
        ],
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
    description:
      "Localized summary of a maintenance work type embedded on maintenance logs.",
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
        description:
          "At least one translation is required, including English (`en`). Slug is generated from the English name.",
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
      assigned_driver_user_id: {
        type: "string",
        format: "uuid",
        nullable: true,
      },
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
    required: [
      "plate_number",
      "chassis_number",
      "vehicle_type_id",
      "vehicle_class_id",
    ],
    properties: {
      plate_number: { type: "string", example: "AA-1-31209" },
      chassis_number: { type: "string" },
      vehicle_type_id: { type: "string", format: "uuid" },
      vehicle_class_id: { type: "string", format: "uuid" },
      assigned_driver_user_id: {
        type: "string",
        format: "uuid",
        nullable: true,
        description:
          "Requires `vehicles.assign_driver` permission when setting a driver",
      },
      make: { type: "string", nullable: true },
      model: { type: "string", nullable: true },
      year: { type: "integer", nullable: true },
      status: { type: "string", enum: ["active", "maintenance", "retired"] },
      notes: { type: "string", nullable: true },
    },
  },
  VehicleLocationSnapshot: {
    type: "object",
    description:
      "Latest known GPS position for a vehicle. One row per vehicle is stored and updated in place (not a history trail).",
    properties: {
      vehicle_id: { type: "string", format: "uuid" },
      driver_user_id: { type: "string", format: "uuid", nullable: true },
      latitude: { type: "number", format: "double", example: 9.0234 },
      longitude: { type: "number", format: "double", example: 38.7504 },
      heading: { type: "number", format: "double", nullable: true, example: 180 },
      speed_kmh: { type: "number", format: "double", nullable: true, example: 32.5 },
      accuracy_m: { type: "number", format: "double", nullable: true, example: 10 },
      recorded_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  VehicleLocationUpdateInput: {
    type: "object",
    required: ["latitude", "longitude"],
    description: "Payload for Socket.IO event `location.publish`.",
    properties: {
      latitude: { type: "number", format: "double", minimum: -90, maximum: 90, example: 9.0234 },
      longitude: { type: "number", format: "double", minimum: -180, maximum: 180, example: 38.7504 },
      heading: { type: "number", format: "double", nullable: true, minimum: 0, maximum: 360, example: 180 },
      speed_kmh: { type: "number", format: "double", nullable: true, minimum: 0, example: 32.5 },
      accuracy_m: { type: "number", format: "double", nullable: true, minimum: 0, example: 10 },
      recorded_at: {
        type: "string",
        format: "date-time",
        nullable: true,
        description: "Device capture time. Defaults to server time when omitted.",
      },
    },
  },
  RealtimeEntityRef: {
    type: "object",
    required: ["entity_type", "entity_id"],
    description: "Generic entity reference for subscribe/unsubscribe events.",
    properties: {
      entity_type: { type: "string", enum: ["vehicle"], example: "vehicle" },
      entity_id: { type: "string", format: "uuid" },
    },
  },
  RealtimeSessionReady: {
    type: "object",
    properties: {
      user_id: { type: "string", format: "uuid" },
      assigned_entity: {
        allOf: [{ $ref: "#/components/schemas/RealtimeEntityRef" }],
        nullable: true,
      },
      capabilities: {
        type: "object",
        properties: {
          location_publish: { type: "boolean" },
          location_subscribe: { type: "boolean" },
          trips: { type: "boolean" },
        },
      },
    },
  },
  RealtimeTripSocketEvents: {
    type: "object",
    description:
      "Upcoming trip events on `/api/ws` for drivers with permission `driver.upcoming`.",
    properties: {
      client_emit: {
        type: "object",
        description: "Events the driver client sends",
        properties: {
          "trips.refresh": {
            type: "string",
            enum: ["trips.refresh"],
            description: "Request a fresh upcoming trip list. Server responds with `trips.snapshot`.",
          },
        },
      },
      server_push: {
        type: "object",
        description: "Events the server sends to the driver",
        properties: {
          "trips.snapshot": {
            type: "array",
            description: "Full upcoming trip list. Sent automatically on connect and after `trips.refresh`.",
            items: { $ref: "#/components/schemas/DriverRideRequest" },
          },
          "trips.added": {
            allOf: [{ $ref: "#/components/schemas/DriverRideRequest" }],
            description: "A trip entered the driver's upcoming list.",
          },
          "trips.updated": {
            allOf: [{ $ref: "#/components/schemas/DriverRideRequest" }],
            description: "An assigned upcoming trip changed.",
          },
          "trips.removed": {
            type: "object",
            description: "A trip left the upcoming list.",
            properties: {
              id: { type: "string", format: "uuid" },
            },
          },
        },
      },
    },
  },
  RealtimeLocationSocketEvents: {
    type: "object",
    description:
      "Vehicle location events on `/api/ws`. Drivers publish with `driver.location`; fleet viewers subscribe with `vehicles.read`.",
    properties: {
      client_emit: {
        type: "object",
        properties: {
          "location.publish": { $ref: "#/components/schemas/VehicleLocationUpdateInput" },
          "location.subscribe": { $ref: "#/components/schemas/RealtimeEntityRef" },
          "location.unsubscribe": { $ref: "#/components/schemas/RealtimeEntityRef" },
        },
      },
      server_push: {
        type: "object",
        properties: {
          "location.snapshot": {
            allOf: [{ $ref: "#/components/schemas/VehicleLocationSnapshot" }],
            nullable: true,
          },
          "location.changed": { $ref: "#/components/schemas/VehicleLocationSnapshot" },
          "location.subscribed": { $ref: "#/components/schemas/RealtimeEntityRef" },
          "location.unsubscribed": { $ref: "#/components/schemas/RealtimeEntityRef" },
        },
      },
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
            description:
              "Optional. When omitted, the title is derived from the selected work type name.",
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
        description:
          "Calculated as `total_cost / quantity_liters` when both values are present.",
      },
      fuel_type: { type: "string", enum: ["diesel", "petrol", "other"] },
      station_name: { type: "string", nullable: true },
      receipt_reference: { type: "string", nullable: true },
      source: { type: "string", enum: ["manual", "driver_app", "import"] },
      notes: { type: "string", nullable: true },
      distance_since_last_km: {
        type: "number",
        nullable: true,
        description:
          "Kilometers driven since the previous fuel log on this vehicle.",
      },
      consumption_km_per_liter: {
        type: "number",
        nullable: true,
        description:
          "Fuel efficiency derived from the previous odometer reading.",
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
        description:
          "Refill timestamp. Defaults to the current time when omitted.",
      },
      odometer_km: {
        type: "integer",
        minimum: 1,
        description: "Odometer reading in kilometers.",
      },
      quantity_liters: {
        type: "number",
        minimum: 0,
        description: "Fuel quantity in liters.",
      },
      total_cost: {
        type: "number",
        minimum: 0,
        description: "Total amount paid for the refill.",
      },
      fuel_type: {
        type: "string",
        enum: ["diesel", "petrol", "other"],
        default: "diesel",
      },
      station_name: {
        type: "string",
        description: "Fuel station or vendor name.",
      },
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
      pricing_model: {
        type: "string",
        enum: ["flat", "distance", "time", "hybrid"],
      },
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
        description:
          "Auto-generated as CTR-{year}-{####} when the contract is created.",
      },
      title: { type: "string" },
      status: {
        type: "string",
        enum: ["draft", "active", "expired", "cancelled"],
      },
      fare_plan_id: { type: "string", format: "uuid", nullable: true },
      fare_plan: {
        allOf: [{ $ref: "#/components/schemas/ContractFarePlanSummary" }],
        nullable: true,
      },
      notes: { type: "string", nullable: true },
      billing_interval: {
        type: "string",
        enum: ["per_trip", "at_contract_end", "monthly", "quarterly", "annually"],
      },
      payment_terms_days: {
        type: "integer",
        minimum: 0,
        maximum: 365,
        nullable: true,
      },
      late_payment_type: {
        type: "string",
        enum: ["none", "flat", "percent", "flat_per_day", "percent_per_day"],
        description:
          "Late payment penalty: one-time (flat/percent) or accruing each overdue calendar day (flat_per_day/percent_per_day).",
      },
      late_payment_fee: {
        type: "number",
        nullable: true,
        description:
          "Fixed amount or percent of invoice total. Per-day types multiply by calendar days overdue.",
      },
      region_ids: { type: "array", items: { type: "string", format: "uuid" } },
      vehicle_type_ids: {
        type: "array",
        items: { type: "string", format: "uuid" },
      },
      vehicle_class_ids: {
        type: "array",
        items: { type: "string", format: "uuid" },
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
  ContractInput: {
    type: "object",
    required: ["title"],
    properties: {
      title: { type: "string" },
      status: {
        type: "string",
        enum: ["draft", "active", "expired", "cancelled"],
        default: "draft",
      },
      fare_plan_id: { type: "string", format: "uuid", nullable: true },
      notes: { type: "string", nullable: true },
      billing_interval: {
        type: "string",
        enum: ["per_trip", "at_contract_end", "monthly", "quarterly", "annually"],
      },
      payment_terms_days: {
        type: "integer",
        minimum: 0,
        maximum: 365,
        nullable: true,
      },
      late_payment_type: {
        type: "string",
        enum: ["none", "flat", "percent", "flat_per_day", "percent_per_day"],
        description:
          "Late payment penalty: one-time (flat/percent) or accruing each overdue calendar day (flat_per_day/percent_per_day).",
      },
      late_payment_fee: {
        type: "number",
        nullable: true,
        description:
          "Fixed amount or percent of invoice total. Per-day types multiply by calendar days overdue.",
      },
      region_ids: { type: "array", items: { type: "string", format: "uuid" } },
      vehicle_type_ids: {
        type: "array",
        items: { type: "string", format: "uuid" },
      },
      vehicle_class_ids: {
        type: "array",
        items: { type: "string", format: "uuid" },
      },
    },
  },
  ContractUpdateInput: {
    type: "object",
    properties: {
      title: { type: "string" },
      status: {
        type: "string",
        enum: ["draft", "active", "expired", "cancelled"],
      },
      fare_plan_id: { type: "string", format: "uuid", nullable: true },
      notes: { type: "string", nullable: true },
      billing_interval: {
        type: "string",
        enum: ["per_trip", "at_contract_end", "monthly", "quarterly", "annually"],
      },
      payment_terms_days: {
        type: "integer",
        minimum: 0,
        maximum: 365,
        nullable: true,
      },
      late_payment_type: {
        type: "string",
        enum: ["none", "flat", "percent", "flat_per_day", "percent_per_day"],
        description:
          "Late payment penalty: one-time (flat/percent) or accruing each overdue calendar day (flat_per_day/percent_per_day).",
      },
      late_payment_fee: {
        type: "number",
        nullable: true,
        description:
          "Fixed amount or percent of invoice total. Per-day types multiply by calendar days overdue.",
      },
      region_ids: { type: "array", items: { type: "string", format: "uuid" } },
      vehicle_type_ids: {
        type: "array",
        items: { type: "string", format: "uuid" },
      },
      vehicle_class_ids: {
        type: "array",
        items: { type: "string", format: "uuid" },
      },
    },
  },
  AdminDispatchQueueItem: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      status: { $ref: "#/components/schemas/RideRequestStatus" },
      scheduled_at: { type: "string", format: "date-time", nullable: true },
      started_at: { type: "string", format: "date-time", nullable: true },
      pickup: { type: "string" },
      dropoff: { type: "string" },
      requester_name: { type: "string" },
      assigned_vehicle_plate: { type: "string", nullable: true },
      assigned_driver_name: { type: "string", nullable: true },
      passenger_count: { type: "integer" },
      sla_priority: {
        type: "string",
        nullable: true,
        enum: ["overdue", "due_soon", "on_track", "unscheduled"],
      },
      sla_minutes: { type: "integer", nullable: true },
      suggested_vehicle: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", format: "uuid" },
          plate_number: { type: "string" },
          driver_name: { type: "string", nullable: true },
          distance_meters: { type: "integer", nullable: true },
        },
      },
      can_auto_assign: { type: "boolean" },
      disruption_reason: {
        type: "string",
        nullable: true,
        enum: ["vehicle_unavailable", "driver_unavailable", "geofence_violation", "stale_location"],
      },
      escalation_level: {
        type: "string",
        nullable: true,
        enum: ["dispatcher", "supervisor"],
      },
    },
  },
  AdminDispatchAutoAssignResult: {
    type: "object",
    properties: {
      assigned: { type: "integer" },
      skipped: { type: "integer" },
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            ride_request_id: { type: "string", format: "uuid" },
            status: { type: "string", enum: ["assigned", "skipped"] },
            reason: { type: "string" },
            vehicle_plate: { type: "string", nullable: true },
          },
        },
      },
    },
  },
  AdminDispatchComplaintItem: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      reference_number: { type: "string" },
      subject: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
      status: {
        type: "string",
        enum: ["submitted", "under_review", "in_progress", "resolved", "closed", "rejected"],
      },
      requester_name: { type: "string" },
      created_at: { type: "string", format: "date-time" },
    },
  },
  AdminDispatchOverview: {
    type: "object",
    properties: {
      counts: {
        type: "object",
        properties: {
          pending_approval: { type: "integer" },
          needs_assignment: { type: "integer" },
          in_progress: { type: "integer" },
          upcoming_today: { type: "integer" },
          disrupted: { type: "integer" },
          not_started: { type: "integer" },
          escalated: { type: "integer" },
          open_complaints: { type: "integer" },
          urgent_complaints: { type: "integer" },
        },
      },
      fleet: {
        type: "object",
        nullable: true,
        properties: {
          dispatchable: { type: "integer" },
          available: { type: "integer" },
          busy: { type: "integer" },
        },
      },
      queues: {
        type: "object",
        properties: {
          needs_assignment: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminDispatchQueueItem" },
          },
          in_progress: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminDispatchQueueItem" },
          },
          upcoming_today: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminDispatchQueueItem" },
          },
          disrupted: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminDispatchQueueItem" },
          },
          not_started: {
            type: "array",
            items: { $ref: "#/components/schemas/AdminDispatchQueueItem" },
          },
        },
      },
      complaints: {
        type: "array",
        items: { $ref: "#/components/schemas/AdminDispatchComplaintItem" },
      },
    },
  },
  AdminDispatchBoard: {
    type: "object",
    properties: {
      trips: {
        type: "array",
        items: { $ref: "#/components/schemas/AdminDispatchBoardTrip" },
      },
      vehicles: {
        type: "array",
        items: { $ref: "#/components/schemas/AdminDispatchBoardVehicle" },
      },
    },
  },
  AdminDispatchBoardTrip: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      requester_name: { type: "string" },
      pickup: { type: "string" },
      dropoff: { type: "string" },
      scheduled_at: { type: "string", format: "date-time", nullable: true },
      passenger_count: { type: "integer" },
      sla_priority: {
        type: "string",
        nullable: true,
        enum: ["overdue", "due_soon", "on_track", "unscheduled"],
      },
      suggested_vehicle: {
        type: "object",
        nullable: true,
        properties: {
          id: { type: "string", format: "uuid" },
          plate_number: { type: "string" },
          driver_name: { type: "string", nullable: true },
          distance_meters: { type: "integer", nullable: true },
        },
      },
      pickup_latitude: { type: "number", nullable: true },
      pickup_longitude: { type: "number", nullable: true },
    },
  },
  AdminDispatchBoardVehicle: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      plate_number: { type: "string" },
      driver_name: { type: "string", nullable: true },
      busy: { type: "boolean" },
      location: {
        type: "object",
        nullable: true,
        properties: {
          latitude: { type: "number" },
          longitude: { type: "number" },
          recorded_at: { type: "string", format: "date-time" },
        },
      },
    },
  },
  AdminRideRequest: {
    type: "object",
    description:
      "Ride request as seen by admin dispatch. Driver is inherited from the assigned vehicle.",
    properties: {
      id: { type: "string", format: "uuid" },
      requester_user_id: { type: "string", format: "uuid" },
      pickup_address: { type: "string" },
      pickup_latitude: { type: "number", nullable: true },
      pickup_longitude: { type: "number", nullable: true },
      dropoff_address: { type: "string" },
      dropoff_latitude: { type: "number", nullable: true },
      dropoff_longitude: { type: "number", nullable: true },
      scheduled_at: { type: "string", format: "date-time", nullable: true },
      passenger_count: { type: "integer" },
      notes: { type: "string", nullable: true },
      status: { $ref: "#/components/schemas/RideRequestStatus" },
      rejection_reason: { type: "string", nullable: true },
      assigned_vehicle_id: { type: "string", format: "uuid", nullable: true },
      assigned_vehicle: {
        $ref: "#/components/schemas/Vehicle",
        nullable: true,
      },
      assigned_driver_user_id: {
        type: "string",
        format: "uuid",
        nullable: true,
      },
      assigned_driver: {
        allOf: [{ $ref: "#/components/schemas/VehicleDriverSummary" }],
        nullable: true,
      },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  RideRequestRequesterSummary: {
    type: "object",
    properties: {
      id: { type: "string", format: "uuid" },
      first_name: { type: "string" },
      middle_name: { type: "string", nullable: true },
      last_name: { type: "string" },
      email: { type: "string" },
      mobile_number: { type: "string" },
      requester_profile: {
        type: "object",
        nullable: true,
        properties: {
          segment: { type: "string", enum: ["individual", "business", "government"] },
          organization_name: { type: "string", nullable: true },
          government_entity_type: { type: "string", nullable: true },
        },
      },
    },
  },
  RideRequest: {
    type: "object",
    description: "Ride request as returned to the requester.",
    properties: {
      id: { type: "string", format: "uuid" },
      requester_user_id: { type: "string", format: "uuid" },
      requester: {
        $ref: "#/components/schemas/RideRequestRequesterSummary",
        nullable: true,
      },
      pickup_address: { type: "string" },
      pickup_latitude: { type: "number", nullable: true },
      pickup_longitude: { type: "number", nullable: true },
      dropoff_address: { type: "string" },
      dropoff_latitude: { type: "number", nullable: true },
      dropoff_longitude: { type: "number", nullable: true },
      scheduled_at: { type: "string", format: "date-time", nullable: true },
      passenger_count: { type: "integer" },
      notes: { type: "string", nullable: true },
      status: { $ref: "#/components/schemas/RideRequestStatus" },
      rejection_reason: { type: "string", nullable: true },
      contract_id: { type: "string", format: "uuid", nullable: true },
      assigned_vehicle_id: { type: "string", format: "uuid", nullable: true },
      assigned_vehicle: {
        $ref: "#/components/schemas/Vehicle",
        nullable: true,
      },
      assigned_driver_user_id: {
        type: "string",
        format: "uuid",
        nullable: true,
      },
      assigned_driver: {
        allOf: [{ $ref: "#/components/schemas/VehicleDriverSummary" }],
        nullable: true,
      },
      assigned_at: { type: "string", format: "date-time", nullable: true },
      started_at: { type: "string", format: "date-time", nullable: true },
      completed_at: { type: "string", format: "date-time", nullable: true },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
      can_edit: { type: "boolean" },
      can_cancel: { type: "boolean" },
      cancel_deadline_at: {
        type: "string",
        format: "date-time",
        nullable: true,
      },
    },
  },
  DriverRideRequest: {
    type: "object",
    description:
      "Ride request as returned by driver trip endpoints. Only trips assigned to the authenticated driver are included, and `pending` is never returned because that status is admin review only.",
    properties: {
      id: { type: "string", format: "uuid" },
      requester_user_id: { type: "string", format: "uuid" },
      requester: {
        $ref: "#/components/schemas/RideRequestRequesterSummary",
        nullable: true,
      },
      pickup_address: { type: "string" },
      pickup_latitude: { type: "number", nullable: true },
      pickup_longitude: { type: "number", nullable: true },
      dropoff_address: { type: "string" },
      dropoff_latitude: { type: "number", nullable: true },
      dropoff_longitude: { type: "number", nullable: true },
      scheduled_at: { type: "string", format: "date-time", nullable: true },
      passenger_count: { type: "integer" },
      notes: { type: "string", nullable: true },
      status: { $ref: "#/components/schemas/RideRequestDriverStatus" },
      rejection_reason: { type: "string", nullable: true },
      assigned_vehicle_id: { type: "string", format: "uuid", nullable: true },
      assigned_vehicle: {
        $ref: "#/components/schemas/Vehicle",
        nullable: true,
      },
      assigned_driver_user_id: {
        type: "string",
        format: "uuid",
        nullable: true,
      },
      assigned_driver: {
        allOf: [{ $ref: "#/components/schemas/VehicleDriverSummary" }],
        nullable: true,
      },
      created_at: { type: "string", format: "date-time" },
      updated_at: { type: "string", format: "date-time" },
    },
  },
  DriverRideRequestStatusActionInput: {
    type: "object",
    required: ["action"],
    properties: {
      action: {
        type: "string",
        enum: ["start", "complete", "no_show"],
        description:
          "`start` moves a confirmed trip to `in_progress`. `complete` moves an in-progress trip to `completed`. `no_show` marks a confirmed or in-progress trip as passenger no-show and applies booking-policy billing.",
      },
    },
  },
  RideRequestStatus: {
    type: "string",
    enum: ["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show"],
    description: "Full ride request lifecycle status for admin APIs.",
    "x-enumDescriptions": rideRequestStatusEnumDescriptions,
  },
  RideRequestDriverStatus: {
    type: "string",
    enum: ["confirmed", "in_progress", "completed", "cancelled", "no_show"],
    description:
      "Statuses exposed to drivers after admin review and assignment. `pending` is excluded.",
    "x-enumDescriptions": rideRequestDriverStatusEnumDescriptions,
  },
  RideRequestHistoryStatus: {
    type: "string",
    enum: ["completed", "cancelled", "no_show"],
    description: "Past-trip status filter for driver history.",
    "x-enumDescriptions": rideRequestHistoryStatusEnumDescriptions,
  },
  RideRequestUpcomingStatus: {
    type: "string",
    enum: ["confirmed", "in_progress"],
    description:
      "Active trip statuses returned by the driver upcoming endpoint.",
    "x-enumDescriptions": rideRequestUpcomingStatusEnumDescriptions,
  },
} as const;

const security = [{ bearerAuth: [] }] as const;
const unauthorized = { $ref: "#/components/responses/Unauthorized" } as const;
const forbidden = { $ref: "#/components/responses/Forbidden" } as const;
const notFound = { $ref: "#/components/responses/NotFound" } as const;
const badRequest = { $ref: "#/components/responses/BadRequest" } as const;

export const extensionPaths = {
  "/api/driver-attendance": {
    get: {
      tags: ["Driver Attendance"],
      summary: "List driver attendance roster",
      description:
        "Lists hired drivers and their attendance record for a work date (Africa/Addis_Ababa). Defaults to today.",
      security,
      parameters: [
        { name: "date", in: "query", schema: { type: "string", format: "date" }, description: "Work date (YYYY-MM-DD)" },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["present", "absent", "late", "on_leave", "off_duty", "unmarked"],
          },
        },
        { name: "search", in: "query", schema: { type: "string" } },
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
      ],
      responses: {
        "200": { description: "Attendance roster" },
        "401": unauthorized,
        "403": forbidden,
      },
    },
    put: {
      tags: ["Driver Attendance"],
      summary: "Create or update driver attendance",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["driver_user_id", "status"],
              properties: {
                driver_user_id: { type: "string", format: "uuid" },
                work_date: { type: "string", format: "date" },
                status: {
                  type: "string",
                  enum: ["present", "absent", "late", "on_leave", "off_duty"],
                },
                check_in_at: { type: "string", nullable: true, description: "HH:mm or ISO timestamp" },
                check_out_at: { type: "string", nullable: true },
                notes: { type: "string", nullable: true },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Attendance saved" },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/driver-attendance/summary": {
    get: {
      tags: ["Driver Attendance"],
      summary: "Summarize driver attendance for a work date",
      security,
      parameters: [
        { name: "date", in: "query", schema: { type: "string", format: "date" } },
      ],
      responses: {
        "200": { description: "Attendance summary" },
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/driver-shifts/templates": {
    get: {
      tags: ["Driver Shifts"],
      summary: "List driver shift periods",
      description: "Returns configured named shifts used when assigning drivers. Defaults to active periods only.",
      security,
      parameters: [
        {
          name: "include_inactive",
          in: "query",
          schema: { type: "boolean" },
          description: "Include deactivated periods",
        },
      ],
      responses: {
        "200": { description: "Shift templates" },
        "401": unauthorized,
        "403": forbidden,
      },
    },
    post: {
      tags: ["Driver Shifts"],
      summary: "Create a driver shift period",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "start_time", "end_time"],
              properties: {
                name: { type: "string" },
                start_time: { type: "string", example: "06:00" },
                end_time: { type: "string", example: "14:00" },
                active: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        "201": { description: "Period created" },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/driver-shifts/templates/{id}": {
    patch: {
      tags: ["Driver Shifts"],
      summary: "Update a driver shift period",
      security,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                start_time: { type: "string" },
                end_time: { type: "string" },
                active: { type: "boolean" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Period updated" },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
    delete: {
      tags: ["Driver Shifts"],
      summary: "Delete a driver shift period",
      security,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "Period deleted" },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
        "409": { description: "Period is still assigned to drivers" },
      },
    },
  },
  "/api/driver-shifts": {
    get: {
      tags: ["Driver Shifts"],
      summary: "List driver shift roster",
      description:
        "Lists hired drivers and their assigned shift for a work date (Africa/Addis_Ababa). Defaults to today.",
      security,
      parameters: [
        { name: "date", in: "query", schema: { type: "string", format: "date" }, description: "Work date (YYYY-MM-DD)" },
        {
          name: "shift",
          in: "query",
          schema: { type: "string" },
          description: "Shift template id, slug, or `unassigned`",
        },
        { name: "search", in: "query", schema: { type: "string" } },
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
      ],
      responses: {
        "200": { description: "Shift roster" },
        "401": unauthorized,
        "403": forbidden,
      },
    },
    put: {
      tags: ["Driver Shifts"],
      summary: "Assign or clear a driver shift",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["driver_user_id"],
              properties: {
                driver_user_id: { type: "string", format: "uuid" },
                work_date: { type: "string", format: "date" },
                shift_template_id: {
                  type: "string",
                  nullable: true,
                  description: "Shift template id or slug. Null clears the assignment.",
                },
                notes: { type: "string", nullable: true },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Shift assignment saved" },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/driver-shifts/summary": {
    get: {
      tags: ["Driver Shifts"],
      summary: "Summarize driver shift coverage for a work date",
      security,
      parameters: [
        { name: "date", in: "query", schema: { type: "string", format: "date" } },
      ],
      responses: {
        "200": { description: "Shift coverage summary" },
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/driver-shifts/week": {
    get: {
      tags: ["Driver Shifts"],
      summary: "List driver shift coverage for an ISO week",
      description: "Returns Monday–Sunday coverage counts and a full hired-driver roster for the week containing the given date.",
      security,
      parameters: [
        { name: "date", in: "query", schema: { type: "string", format: "date" } },
        { name: "search", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": { description: "Week shift roster" },
        "401": unauthorized,
        "403": forbidden,
      },
    },
  },
  "/api/driver-shifts/{id}": {
    delete: {
      tags: ["Driver Shifts"],
      summary: "Clear a driver shift assignment",
      security,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "Assignment cleared" },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/driver-attendance/check-in": {
    post: {
      tags: ["Driver Attendance"],
      summary: "Check a driver in",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["driver_user_id"],
              properties: {
                driver_user_id: { type: "string", format: "uuid" },
                work_date: { type: "string", format: "date" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Checked in" },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/driver-attendance/check-out": {
    post: {
      tags: ["Driver Attendance"],
      summary: "Check a driver out",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["driver_user_id"],
              properties: {
                driver_user_id: { type: "string", format: "uuid" },
                work_date: { type: "string", format: "date" },
              },
            },
          },
        },
      },
      responses: {
        "200": { description: "Checked out" },
        "400": badRequest,
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/driver-attendance/{id}": {
    delete: {
      tags: ["Driver Attendance"],
      summary: "Clear a driver attendance record",
      security,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
      responses: {
        "200": { description: "Attendance cleared" },
        "401": unauthorized,
        "403": forbidden,
        "404": notFound,
      },
    },
  },
  "/api/business-tin/{tin}": {
    get: {
      tags: ["Business TIN"],
      summary: "Look up a business TIN",
      description:
        "Looks up an Ethiopian business TIN through the configured eTrade registration service. Returns the owner name and trade licenses when a match is found.",
      parameters: [
        {
          name: "tin",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^\\d{10}$", example: "1111111111" },
          description: "10-digit Ethiopian TIN",
        },
      ],
      responses: {
        "200": {
          description: "TIN registration",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      registration: {
                        $ref: "#/components/schemas/BusinessTinRegistration",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "404": notFound,
      },
    },
  },
  "/api/business-tin/{tin}/license": {
    get: {
      tags: ["Business TIN"],
      summary: "Look up a business trade license",
      description:
        "Returns full eTrade license details for a TIN and license number selected from the TIN registration list.",
      parameters: [
        {
          name: "tin",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^\\d{10}$", example: "1111111111" },
          description: "10-digit Ethiopian TIN",
        },
        {
          name: "license_no",
          in: "query",
          required: true,
          schema: { type: "string", example: "AK/AA/14/671/642182/2009" },
          description: "Trade license number from the TIN registration licenses list",
        },
      ],
      responses: {
        "200": {
          description: "Business license detail",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      license: {
                        $ref: "#/components/schemas/BusinessLicenseDetail",
                      },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "404": notFound,
      },
    },
  },
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
          schema: {
            type: "string",
            enum: [
              "ride_requests",
              "user_registrations",
              "insurance",
              "inspection",
            ],
          },
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
                        items: {
                          $ref: "#/components/schemas/NotificationTemplate",
                        },
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
                        items: {
                          $ref: "#/components/schemas/NotificationTemplate",
                        },
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
                  description:
                    "Email address or phone number. Uses admin profile contact when omitted.",
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
                      delivery: {
                        $ref: "#/components/schemas/NotificationTestDelivery",
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Test notification sent successfully.",
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
  "/api/notifications/send": {
    post: {
      tags: ["Notifications"],
      summary: "Send a custom message",
      description:
        "Send a custom email, SMS, and/or mobile push message to a group (drivers, customers, dispatchers) or to specific user IDs. Recipients missing an email or phone number are skipped for that channel.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["channels", "message"],
              properties: {
                channels: {
                  type: "array",
                  minItems: 1,
                  items: { type: "string", enum: ["email", "sms", "push"] },
                },
                audience: {
                  type: "string",
                  enum: ["drivers", "customers", "dispatchers"],
                },
                user_ids: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                },
                title: {
                  type: "string",
                  maxLength: 80,
                  description: "Required when email or push is selected.",
                },
                message: { type: "string", maxLength: 500 },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Message dispatch result",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      recipient_count: { type: "integer" },
                      results: {
                        type: "object",
                        additionalProperties: {
                          type: "object",
                          properties: {
                            sent: { type: "integer" },
                            skipped: { type: "integer" },
                            failed: { type: "integer" },
                          },
                        },
                      },
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
  "/api/notifications/{channel}": {
    get: {
      tags: ["Notifications"],
      summary: "Get notification channel configuration",
      description:
        "Returns email or SMS provider settings. Sensitive credential fields are masked.",
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
                      configuration: {
                        $ref: "#/components/schemas/NotificationConfiguration",
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
    patch: {
      tags: ["Notifications"],
      summary: "Update notification channel configuration",
      description:
        "Upserts email or SMS provider settings. SMS currently supports AfroSMS only.",
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
                      configuration: {
                        $ref: "#/components/schemas/NotificationConfiguration",
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
      },
    },
  },
  "/api/notifications/{channel}/test": {
    post: {
      tags: ["Notifications"],
      summary: "Send test SMS",
      description:
        "Sends a plain test SMS using the configured SMS provider. Email test uses template test endpoint instead.",
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
                      delivery: {
                        $ref: "#/components/schemas/NotificationTestDelivery",
                      },
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
  "/api/devices/tokens": {
    post: {
      tags: ["Devices"],
      summary: "Register FCM device token",
      description:
        "Registers or updates an FCM device token for the authenticated user. " +
        "The API proxies to the external notification service (`POST /api/v1/devices/tokens`) " +
        "and sets `clientId` to `user-{userId}` so push broadcasts can target the device. " +
        "Requires `devices.register` permission (customer and driver roles by default). " +
        "`NOTIFICATION_BROADCAST_URL` and `NOTIFICATION_APPLICATION_ID` must be configured on the API server.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["token", "platform"],
              properties: {
                token: {
                  type: "string",
                  description: "FCM device token from the client SDK",
                  example: "fcm-device-token-from-client-sdk",
                },
                platform: {
                  type: "string",
                  enum: ["android", "ios"],
                  example: "android",
                },
                clientId: {
                  type: "string",
                  description:
                    "Optional. If provided, must match `user-{authenticatedUserId}` or the request is rejected.",
                  example: "user-abc123",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Device token registered",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      device: {
                        $ref: "#/components/schemas/RegisteredDeviceToken",
                      },
                    },
                  },
                  message: {
                    type: "string",
                    example: "Device token registered successfully.",
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
  "/api/notification-delivery-logs": {
    get: {
      tags: ["Notification Delivery Logs"],
      summary: "List notification delivery logs",
      description:
        "Paginated history of notification send attempts including production dispatches and admin tests.",
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
          schema: {
            type: "string",
            enum: [
              "ride_requests",
              "user_registrations",
              "insurance",
              "inspection",
              "invoices",
              "password_reset",
              "system",
            ],
          },
        },
        {
          name: "channel",
          in: "query",
          schema: { type: "string", enum: ["email", "sms", "push"] },
        },
        { name: "event", in: "query", schema: { type: "string" } },
        { name: "is_test", in: "query", schema: { type: "boolean" } },
        {
          name: "from",
          in: "query",
          schema: { type: "string", format: "date-time" },
        },
        {
          name: "to",
          in: "query",
          schema: { type: "string", format: "date-time" },
        },
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
                    items: {
                      $ref: "#/components/schemas/NotificationDeliveryLog",
                    },
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
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
                      delivery_log: {
                        $ref: "#/components/schemas/NotificationDeliveryLog",
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
            enum: [
              "create",
              "update",
              "delete",
              "login",
              "logout",
              "assign",
              "revoke",
              "test",
            ],
          },
        },
        {
          name: "actor_user_id",
          in: "query",
          schema: { type: "string", format: "uuid" },
        },
        { name: "entity_type", in: "query", schema: { type: "string" } },
        {
          name: "from",
          in: "query",
          schema: { type: "string", format: "date-time" },
        },
        {
          name: "to",
          in: "query",
          schema: { type: "string", format: "date-time" },
        },
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
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/AuditLog" },
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
  "/api/audit-logs/{id}": {
    get: {
      tags: ["Audit Logs"],
      summary: "Get audit log entry",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
        {
          name: "vehicle_type_id",
          in: "query",
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "vehicle_class_id",
          in: "query",
          schema: { type: "string", format: "uuid" },
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["active", "maintenance", "retired"],
          },
        },
        {
          name: "assigned_driver_user_id",
          in: "query",
          schema: { type: "string", format: "uuid" },
        },
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
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Vehicle" },
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
      tags: ["Vehicles"],
      summary: "Create vehicle",
      description:
        "Requires `vehicles.write`. Setting `assigned_driver_user_id` additionally requires `vehicles.assign_driver`.",
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
                    properties: {
                      vehicle: { $ref: "#/components/schemas/Vehicle" },
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
  "/api/vehicles/driver-options": {
    get: {
      tags: ["Vehicles"],
      summary: "List assignable drivers",
      description:
        "Returns active driver accounts for the vehicle driver assignment UI. Requires `vehicles.assign_driver` permission.",
      security,
      parameters: [
        {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search name, email, or mobile",
        },
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
                        items: {
                          $ref: "#/components/schemas/VehicleDriverOption",
                        },
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
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
                    properties: {
                      vehicle: { $ref: "#/components/schemas/Vehicle" },
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
      tags: ["Vehicles"],
      summary: "Update vehicle",
      description:
        "Requires `vehicles.write`. Changing `assigned_driver_user_id` requires `vehicles.assign_driver`. A driver can only be linked to one vehicle at a time.",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
                    properties: {
                      vehicle: { $ref: "#/components/schemas/Vehicle" },
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
      tags: ["Vehicles"],
      summary: "Delete vehicle",
      description: "Requires `vehicles.delete`.",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
  "/api/vehicles/{id}/location": {
    get: {
      tags: ["Vehicles"],
      summary: "Get vehicle location snapshot",
      description:
        "Returns the latest saved GPS position for a vehicle. Requires `vehicles.read`.\n\n" +
        "Use this once on page load. For live updates, connect to Socket.IO namespace `/api/ws` and emit `location.subscribe` (see that entry).\n\n" +
        "Returns `location: null` when no position has been published yet.",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Latest vehicle location snapshot",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      location: {
                        allOf: [{ $ref: "#/components/schemas/VehicleLocationSnapshot" }],
                        nullable: true,
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
      },
    },
  },
  "/api/ws": {
    get: {
      tags: ["Realtime"],
      summary: "Unified realtime channel (Socket.IO)",
      description:
        "Single Socket.IO namespace for all live features. Connect once, then use **event names** — not separate HTTP endpoints.\n\n" +
        "**Namespace:** `/api/ws`\n\n" +
        "- URL: `http://{host}` with namespace `/api/ws`\n" +
        '- Auth: `auth: { token: "{access_token}" }` on connect, or `Authorization: Bearer {access_token}` header\n' +
        "- On connect, server emits `session.ready` with capabilities (`RealtimeSessionReady`)\n\n" +
        "---\n\n" +
        "## Trip events (`driver.upcoming`)\n\n" +
        "See schema: **`RealtimeTripSocketEvents`**\n\n" +
        "**Client emit**\n" +
        "- `trips.refresh` — request a fresh list\n\n" +
        "**Server push**\n" +
        "- `trips.snapshot` — full upcoming trip list (`DriverRideRequest[]`). Sent automatically on connect and after `trips.refresh`\n" +
        "- `trips.added` — new upcoming trip\n" +
        "- `trips.updated` — trip changed\n" +
        "- `trips.removed` — `{ id }` trip left the list\n\n" +
        "REST alternative for paginated fetch: `GET /api/ride-requests/driver/upcoming`\n\n" +
        "---\n\n" +
        "## Location events\n\n" +
        "See schema: **`RealtimeLocationSocketEvents`**\n\n" +
        "**Client emit (driver)**\n" +
        "- `location.publish` — payload: `VehicleLocationUpdateInput`\n\n" +
        "**Client emit (fleet viewer)**\n" +
        "- `location.subscribe` / `location.unsubscribe` — payload: `RealtimeEntityRef`\n\n" +
        "**Server push**\n" +
        "- `location.snapshot`, `location.changed`, `location.subscribed`, `location.unsubscribed`\n\n" +
        "REST snapshot on page load: `GET /api/vehicles/{id}/location`\n\n" +
        "---\n\n" +
        "## Session events\n\n" +
        "- `session.ready`, `session.ping`, `session.pong`, `session.error`",
      security,
      responses: {
        "200": {
          description: "Socket.IO event catalog (not an HTTP GET endpoint)",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  namespace: { type: "string", example: "/api/ws" },
                  session: { $ref: "#/components/schemas/RealtimeSessionReady" },
                  trips: { $ref: "#/components/schemas/RealtimeTripSocketEvents" },
                  location: { $ref: "#/components/schemas/RealtimeLocationSocketEvents" },
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
  "/api/vehicles/{id}/maintenance": {
    get: {
      tags: ["Vehicles"],
      summary: "List vehicle maintenance logs",
      description:
        "Returns paginated maintenance logs for a vehicle. Each log includes the resolved `work_type` summary.\n\n" +
        "- Permission: `vehicles.read`",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
                    items: {
                      $ref: "#/components/schemas/VehicleMaintenanceLog",
                    },
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
        {
          name: "id",
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
                      maintenance_log: {
                        $ref: "#/components/schemas/VehicleMaintenanceLog",
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
  "/api/vehicles/{id}/maintenance/{maintenanceId}": {
    patch: {
      tags: ["Vehicles"],
      summary: "Update vehicle maintenance log",
      description:
        "Updates a maintenance log on a vehicle. Work type can be changed by sending `work_type_id`, `work_type_slug`, or legacy `type`.\n\n" +
        "- Permission: `vehicles.write`",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
            schema: {
              $ref: "#/components/schemas/VehicleMaintenanceUpdateInput",
            },
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
                      maintenance_log: {
                        $ref: "#/components/schemas/VehicleMaintenanceLog",
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
  "/api/vehicles/{id}/fuel": {
    get: {
      tags: ["Vehicles"],
      summary: "List vehicle fuel logs",
      description:
        "Returns paginated fuel refill logs for a vehicle. Each log includes derived efficiency fields based on the previous log's odometer reading.\n\n" +
        "- Permission: `vehicles.read`",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
                        items: {
                          $ref: "#/components/schemas/MaintenanceWorkType",
                        },
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
      description:
        "Paginated list of maintenance work types. Requires `maintenance_work_types.read`.",
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
      description:
        "Requires `maintenance_work_types.write`. English (`en`) translation is required to generate the slug.",
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
                      maintenance_work_type: {
                        $ref: "#/components/schemas/MaintenanceWorkType",
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
      },
    },
  },
  "/api/maintenance-work-types/{id}": {
    get: {
      tags: ["Maintenance Work Types"],
      summary: "Get maintenance work type",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
                      maintenance_work_type: {
                        $ref: "#/components/schemas/MaintenanceWorkType",
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
      },
    },
    patch: {
      tags: ["Maintenance Work Types"],
      summary: "Update maintenance work type",
      description: "Requires `maintenance_work_types.write`.",
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
                      maintenance_work_type: {
                        $ref: "#/components/schemas/MaintenanceWorkType",
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
    delete: {
      tags: ["Maintenance Work Types"],
      summary: "Delete maintenance work type",
      description:
        "Requires `maintenance_work_types.delete`. Returns 409 if the work type is referenced by maintenance logs.",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
  "/api/admin/dispatch/overview": {
    get: {
      tags: ["Dispatch"],
      summary: "Dispatch overview",
      description:
        "Working board for dispatchers: assignment queue, live trips, upcoming today, fleet availability, and open complaints. Matching unassigned trips are assigned automatically. Requires `ride_requests.read` or `complaints.read`.",
      security,
      parameters: [{ $ref: "#/components/parameters/Locale" }],
      responses: {
        "200": {
          description: "Dispatch overview",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      overview: { $ref: "#/components/schemas/AdminDispatchOverview" },
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
  "/api/admin/dispatch/board": {
    get: {
      tags: ["Dispatch"],
      summary: "Live dispatch board",
      description:
        "Unassigned trips and dispatchable vehicles with last known GPS. Used by the drag-and-drop dispatcher. Requires `ride_requests.read` and `vehicles.read`.",
      security,
      parameters: [{ $ref: "#/components/parameters/Locale" }],
      responses: {
        "200": {
          description: "Live dispatch board",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      board: { $ref: "#/components/schemas/AdminDispatchBoard" },
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
  "/api/admin/dispatch/auto-assign": {
    post: {
      tags: ["Dispatch"],
      summary: "Auto-assign vehicles by SLA",
      description:
        "Assigns matching vehicles to pending or confirmed unassigned trips, highest SLA risk first. Assignment also approves a pending request. Nearest available vehicle with a driver wins. Requires `ride_requests.write`.",
      security,
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                ride_request_ids: {
                  type: "array",
                  items: { type: "string", format: "uuid" },
                  description: "Limit assignment to these trips. Omit to process the full unassigned queue.",
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Auto-assign result",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      result: { $ref: "#/components/schemas/AdminDispatchAutoAssignResult" },
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
  "/api/admin/ride-requests": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "List ride requests",
      description:
        "Admin view of all customer ride requests. Requires `ride_requests.read`.",
      security,
      parameters: [
        { $ref: "#/components/parameters/Page" },
        { $ref: "#/components/parameters/Limit" },
        { $ref: "#/components/parameters/Locale" },
        { name: "search", in: "query", schema: { type: "string" } },
        { $ref: "#/components/parameters/RideRequestStatus" },
        {
          name: "upcoming",
          in: "query",
          schema: { type: "boolean" },
          description: "Only scheduled future trips",
        },
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
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/AdminRideRequest" },
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
  "/api/admin/ride-requests/{id}": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "Get ride request",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
                      ride_request: {
                        $ref: "#/components/schemas/AdminRideRequest",
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
      },
    },
  },
  "/api/admin/ride-requests/{id}/assignable-vehicles": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "List assignable vehicles for dispatch",
      description:
        "Returns active vehicles with an assigned driver that match the ride request type/class. Available for pending or confirmed requests (or when already assigned).",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        { $ref: "#/components/parameters/Locale" },
        {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Filter by plate or driver",
        },
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
        "Assigns a fleet vehicle to a pending or confirmed ride request. Pending requests are approved as part of assignment. Driver is inherited from the vehicle's default driver. Requires `ride_requests.write`.",
      security,
      parameters: [
        {
          name: "id",
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
                      ride_request: {
                        $ref: "#/components/schemas/AdminRideRequest",
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
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
  },
  "/api/admin/ride-requests/{id}/unassign": {
    post: {
      tags: ["Admin Ride Requests"],
      summary: "Unassign vehicle from ride request",
      description:
        "Clears vehicle and driver assignment from a confirmed ride request.",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
                      ride_request: {
                        $ref: "#/components/schemas/AdminRideRequest",
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
  "/api/admin/ride-requests/{id}/status": {
    post: {
      tags: ["Admin Ride Requests"],
      summary: "Update ride request status",
      description:
        "Admin workflow actions: `confirm`, `reject`, `start`, `complete`, or `no_show`. Reject accepts optional `rejection_reason`. Triggers notification templates when configured.",
      security,
      parameters: [
        {
          name: "id",
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
            schema: {
              type: "object",
              required: ["action"],
              properties: {
                action: {
                  type: "string",
                  enum: ["confirm", "reject", "start", "complete", "no_show"],
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
                      ride_request: {
                        $ref: "#/components/schemas/AdminRideRequest",
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
        {
          name: "search",
          in: "query",
          schema: { type: "string" },
          description: "Search reference number or title",
        },
        {
          name: "status",
          in: "query",
          schema: {
            type: "string",
            enum: ["draft", "active", "expired", "cancelled"],
          },
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
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Contract" },
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
                    properties: {
                      contract: { $ref: "#/components/schemas/Contract" },
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
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
        {
          name: "id",
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
                    properties: {
                      contract: { $ref: "#/components/schemas/Contract" },
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
    delete: {
      tags: ["Contracts"],
      summary: "Delete customer contract",
      description:
        "Requires `contracts.delete`. Fails with 409 when linked ride requests exist.",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
      ],
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
        "Returns the fleet vehicle whose `assigned_driver_user_id` matches the authenticated user. Used by the driver app to show their primary vehicle.\n\n" +
        "For live GPS and trips, connect once to Socket.IO namespace `/api/ws` (see that entry).",
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
                      vehicle: {
                        $ref: "#/components/schemas/Vehicle",
                        nullable: true,
                      },
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
  "/api/ride-requests/{id}": {
    get: {
      tags: ["Ride Requests"],
      summary: "Get ride request",
      description:
        "Returns a ride request owned by the authenticated user, including the requester profile for display in trip detail screens.",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
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
                      ride_request: {
                        $ref: "#/components/schemas/RideRequest",
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
      },
    },
  },
  "/api/ride-requests/driver/{id}": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "Driver trip details",
      description:
        "Returns a single trip assigned to the authenticated driver. Requires `driver.trip`.",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
        },
        { $ref: "#/components/parameters/Locale" },
      ],
      responses: {
        "200": {
          description: "Trip details for the driver",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      ride_request: {
                        $ref: "#/components/schemas/DriverRideRequest",
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
      },
    },
  },
  "/api/ride-requests/driver/{id}/status": {
    post: {
      tags: ["Admin Ride Requests"],
      summary: "Update driver trip status",
      description:
        "Driver workflow for assigned trips. Requires `driver.trip`.\n\n" +
        "| Action | From status | To status | Notes |\n" +
        "|--------|-------------|-----------|-------|\n" +
        "| `start` | `confirmed` | `in_progress` | Fails if scheduled pickup is still in the future |\n" +
        "| `complete` | `in_progress` | `completed` | — |\n\n" +
        "On success, notification templates for trip started/completed are queued when configured, and connected driver clients receive updated trip lists via **`/api/ws`** (`trips.updated` / `trips.removed`; see **Realtime** tag).",
      security,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" },
          description: "Ride request ID assigned to the authenticated driver.",
        },
        { $ref: "#/components/parameters/Locale" },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: "#/components/schemas/DriverRideRequestStatusActionInput",
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated trip for the driver",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      ride_request: {
                        $ref: "#/components/schemas/DriverRideRequest",
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
        "409": { $ref: "#/components/responses/Conflict" },
      },
    },
  },
  "/api/admin/system-settings/deadline": {
    get: {
      tags: ["System Settings"],
      summary: "Get deadline hub settings",
      description:
        "Returns the configurable deadline windows used across ride requests, invoices, and compliance alerts.",
      security,
      responses: {
        "200": {
          description: "Current deadline setting",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      ride_request_cancel_grace_minutes: { type: "integer" },
                      ride_request_edit_grace_minutes: { type: "integer" },
                      ride_request_reminder_hours: { type: "integer" },
                      dispatch_escalate_dispatcher_minutes: { type: "integer" },
                      dispatch_escalate_supervisor_minutes: { type: "integer" },
                      invoice_due_soon_days: { type: "integer" },
                      insurance_due_soon_days: { type: "integer" },
                      inspection_due_soon_days: { type: "integer" },
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
    patch: {
      tags: ["System Settings"],
      summary: "Update deadline hub settings",
      description:
        "Updates the configurable deadline windows used across ride requests, invoices, and compliance alerts. Requires `system_settings.write`.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                ride_request_cancel_grace_minutes: {
                  type: "integer",
                  minimum: 1,
                  maximum: 1440,
                },
                ride_request_edit_grace_minutes: {
                  type: "integer",
                  minimum: 1,
                  maximum: 1440,
                },
                ride_request_reminder_hours: {
                  type: "integer",
                  minimum: 1,
                  maximum: 168,
                },
                dispatch_escalate_dispatcher_minutes: {
                  type: "integer",
                  minimum: 1,
                  maximum: 1440,
                },
                dispatch_escalate_supervisor_minutes: {
                  type: "integer",
                  minimum: 1,
                  maximum: 1440,
                },
                invoice_due_soon_days: {
                  type: "integer",
                  minimum: 1,
                  maximum: 365,
                },
                insurance_due_soon_days: {
                  type: "integer",
                  minimum: 1,
                  maximum: 3650,
                },
                inspection_due_soon_days: {
                  type: "integer",
                  minimum: 1,
                  maximum: 3650,
                },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated deadline setting",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      ride_request_cancel_grace_minutes: { type: "integer" },
                      ride_request_edit_grace_minutes: { type: "integer" },
                      ride_request_reminder_hours: { type: "integer" },
                      dispatch_escalate_dispatcher_minutes: { type: "integer" },
                      dispatch_escalate_supervisor_minutes: { type: "integer" },
                      invoice_due_soon_days: { type: "integer" },
                      insurance_due_soon_days: { type: "integer" },
                      inspection_due_soon_days: { type: "integer" },
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
  "/api/admin/system-settings/vat": {
    get: {
      tags: ["System Settings"],
      summary: "Get invoice VAT settings",
      description:
        "Returns whether VAT is added to new invoices and the percentage rate used.",
      security,
      responses: {
        "200": {
          description: "Current VAT setting",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      enabled: { type: "boolean" },
                      rate_percent: { type: "number" },
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
    patch: {
      tags: ["System Settings"],
      summary: "Update invoice VAT settings",
      description:
        "Updates whether VAT is added on new invoices and the percentage rate. Already issued invoices are not changed. Requires `system_settings.write`.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                rate_percent: { type: "number", minimum: 0, maximum: 100 },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated VAT setting",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      enabled: { type: "boolean" },
                      rate_percent: { type: "number" },
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
  "/api/admin/system-settings/payment-gateway": {
    get: {
      tags: ["System Settings"],
      summary: "Get payment gateway settings",
      description:
        "Returns payment methods shown to customers when paying invoices.",
      security,
      responses: {
        "200": {
          description: "Current payment gateway settings",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      payment_gateway: { $ref: "#/components/schemas/CustomerPaymentOptions" },
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
    patch: {
      tags: ["System Settings"],
      summary: "Update payment gateway settings",
      description:
        "Updates customer invoice payment methods. Requires `system_settings.write`.",
      security,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CustomerPaymentOptions" },
          },
        },
      },
      responses: {
        "200": {
          description: "Updated payment gateway settings",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      payment_gateway: { $ref: "#/components/schemas/CustomerPaymentOptions" },
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
  "/api/admin/system-settings/payment-gateway/logo": {
    post: {
      tags: ["System Settings"],
      summary: "Upload a payment method logo",
      description:
        "Uploads a JPG, PNG, or WEBP logo for a payment method. Requires `system_settings.write`. Pass the returned `logo_url` on the method when saving payment gateway settings.",
      security,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["logo"],
              properties: {
                logo: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description: "Uploaded logo URL",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      logo_url: { type: "string" },
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
  "/api/ride-requests/driver/upcoming": {
    get: {
      tags: ["Admin Ride Requests"],
      summary: "Driver upcoming trips",
      description:
        "Lists rides where the authenticated user is the assigned driver. Only trips with upcoming driver statuses are returned. `pending` is never included because that status is admin review only.\n\n" +
        "## Realtime upcoming trips (Socket.IO)\n\n" +
        "Connect to **`/api/ws`** (see **Realtime** tag) and use trip events from schema **`RealtimeTripSocketEvents`**:\n\n" +
        "| Direction | Event | Payload |\n" +
        "|-----------|-------|---------|\n" +
        "| Client → server | `trips.refresh` | none |\n" +
        "| Server → client | `trips.snapshot` | `DriverRideRequest[]` |\n" +
        "| Server → client | `trips.added` | `DriverRideRequest` |\n" +
        "| Server → client | `trips.updated` | `DriverRideRequest` |\n" +
        "| Server → client | `trips.removed` | `{ id }` |\n\n" +
        "`trips.snapshot` is sent automatically on connect when the driver has `driver.upcoming`.\n\n" +
        "- Permission: `driver.upcoming`\n" +
        "- Localized fields include a `translations` array with all languages (`en`, `am`, ...).",
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
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/DriverRideRequest" },
                  },
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
                  data: {
                    type: "array",
                    items: { $ref: "#/components/schemas/DriverRideRequest" },
                  },
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
                    items: {
                      $ref: "#/components/schemas/VehicleMaintenanceLog",
                    },
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
            schema: {
              $ref: "#/components/schemas/DriverVehicleMaintenanceInput",
            },
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
                      maintenance_log: {
                        $ref: "#/components/schemas/VehicleMaintenanceLog",
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
            schema: {
              $ref: "#/components/schemas/DriverVehicleMaintenanceUpdateInput",
            },
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
                      maintenance_log: {
                        $ref: "#/components/schemas/VehicleMaintenanceLog",
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
