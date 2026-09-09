/**
 * OpenAPI tag, schemas, and paths for User In-App Notifications API.
 * Included in Scalar API Reference at /api/docs.
 */

const unauthorized = { $ref: "#/components/responses/Unauthorized" } as const;
const notFound = { $ref: "#/components/responses/NotFound" } as const;
const badRequest = { $ref: "#/components/responses/BadRequest" } as const;

export const userNotificationTag = {
  name: "User Notifications",
  description:
    "In-app notifications, unread counters, and read status for authenticated operators and users.",
} as const;

export const userNotificationSchemas = {
  InAppNotification: {
    type: "object",
    required: ["id", "user_id", "title", "message", "category", "priority", "created_at"],
    properties: {
      id: { type: "string", format: "uuid", example: "de04f22a-77c8-43cb-863c-5fdbfa4197c5" },
      user_id: { type: "string", format: "uuid", example: "42ab1e60-9922-441a-96bc-cab26fefaa9e" },
      title: { type: "string", example: "Ride request escalated" },
      message: {
        type: "string",
        example: "Ride request #A1B2C3 has exceeded the 15-minute dispatch SLA.",
      },
      category: {
        type: "string",
        enum: ["ride_request", "dispatch_escalation", "compliance", "invoice", "geofence", "system"],
        example: "dispatch_escalation",
      },
      priority: {
        type: "string",
        enum: ["low", "medium", "high", "urgent"],
        example: "urgent",
      },
      action_url: {
        type: "string",
        nullable: true,
        example: "/admin/ride-requests",
      },
      read_at: {
        type: "string",
        format: "date-time",
        nullable: true,
        example: "2026-09-09T07:15:00.000Z",
      },
      created_at: {
        type: "string",
        format: "date-time",
        example: "2026-09-09T07:00:00.000Z",
      },
    },
  },
} as const;

export const userNotificationPaths = {
  "/api/user-notifications": {
    get: {
      tags: ["User Notifications"],
      summary: "List in-app notifications",
      description:
        "Fetches a paginated list of in-app notifications for the authenticated user, optionally filtered by read status or category.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "limit",
          in: "query",
          description: "Number of notifications to return (max 100, default 30).",
          schema: { type: "integer", default: 30 },
        },
        {
          name: "offset",
          in: "query",
          description: "Number of notifications to skip for pagination.",
          schema: { type: "integer", default: 0 },
        },
        {
          name: "unreadOnly",
          in: "query",
          description: "When true, returns only unread notifications.",
          schema: { type: "boolean", default: false },
        },
        {
          name: "category",
          in: "query",
          description: "Filter by notification category (e.g. ride_request, compliance, invoice).",
          schema: {
            type: "string",
            enum: ["ride_request", "dispatch_escalation", "compliance", "invoice", "geofence", "system"],
          },
        },
      ],
      responses: {
        "200": {
          description: "Paginated notifications and unread count",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      notifications: {
                        type: "array",
                        items: { $ref: "#/components/schemas/InAppNotification" },
                      },
                      unreadCount: { type: "integer", example: 3 },
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
  "/api/user-notifications/unread-count": {
    get: {
      tags: ["User Notifications"],
      summary: "Get unread notifications count",
      description:
        "Returns the total count of unread in-app notifications for the authenticated user (used for lightweight header badge sync).",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "Unread notification count",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      unreadCount: { type: "integer", example: 3 },
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
  "/api/user-notifications/{id}/read": {
    patch: {
      tags: ["User Notifications"],
      summary: "Mark notification as read",
      description: "Marks a specific in-app notification as read for the authenticated user.",
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          description: "UUID of the notification to mark as read.",
          schema: { type: "string", format: "uuid" },
        },
      ],
      responses: {
        "200": {
          description: "Notification marked as read",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      notification: { $ref: "#/components/schemas/InAppNotification" },
                    },
                  },
                },
              },
            },
          },
        },
        "400": badRequest,
        "401": unauthorized,
        "404": notFound,
      },
    },
  },
  "/api/user-notifications/read-all": {
    post: {
      tags: ["User Notifications"],
      summary: "Mark all notifications as read",
      description: "Marks all unread in-app notifications as read for the authenticated user.",
      security: [{ bearerAuth: [] }],
      responses: {
        "200": {
          description: "All notifications marked as read",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  data: {
                    type: "object",
                    properties: {
                      updatedCount: { type: "integer", example: 5 },
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
  "/api/user-notifications/test": {
    post: {
      tags: ["User Notifications"],
      summary: "Trigger test notification",
      description:
        "Dispatches a test notification to the authenticated user across WebSocket, In-App persistence, and Browser Push. Useful for testing UI alerts, audio chimes, and push notifications.",
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: false,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  example: "Test Notification",
                  description: "Optional custom notification title.",
                },
                message: {
                  type: "string",
                  example: "This is a test notification for real-time delivery.",
                  description: "Optional custom notification body message.",
                },
                category: {
                  type: "string",
                  enum: [
                    "ride_request",
                    "dispatch_escalation",
                    "compliance",
                    "invoice",
                    "geofence",
                    "system",
                  ],
                  default: "system",
                  example: "system",
                },
                priority: {
                  type: "string",
                  enum: ["low", "medium", "high", "urgent"],
                  default: "medium",
                  example: "medium",
                },
                actionUrl: {
                  type: "string",
                  default: "/admin",
                  example: "/admin",
                  description: "Optional URL path to navigate when clicking the notification.",
                },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description: "Test notification dispatched successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", enum: [true] },
                  message: { type: "string", example: "Test notification dispatched successfully." },
                  data: {
                    type: "object",
                    properties: {
                      notification: { $ref: "#/components/schemas/InAppNotification" },
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
} as const;

