export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Smart Dispatch System API",
    version: "1.0.0",
    description:
      "REST API for the Smart Dispatch System. All successful responses use `{ success: true, data }`. Errors use `{ success: false, error }`. Paginated lists include a `pagination` object. Role labels support multiple languages (`en`, `am`) via a `translations` array in requests; responses resolve `name` and `description` using `?locale=` or `Accept-Language`.",
  },
  tags: [
    { name: "Health", description: "Service health checks" },
    { name: "Auth", description: "Authentication and session management" },
    { name: "Users", description: "User management (admin only)" },
    { name: "Roles", description: "Role management (admin only)" },
    { name: "Auth Roles", description: "User–role assignments (admin only)" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Access token from `/api/auth/login` or `/api/auth/token`",
      },
    },
    schemas: {
      ApiErrorResponse: {
        type: "object",
        required: ["success", "error"],
        properties: {
          success: { type: "boolean", enum: [false] },
          error: { type: "string", example: "Invalid email or password." },
        },
      },
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
          total: { type: "integer", example: 145 },
          total_pages: { type: "integer", example: 8 },
          has_next: { type: "boolean", example: true },
          has_prev: { type: "boolean", example: false },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          first_name: { type: "string" },
          middle_name: { type: "string", nullable: true },
          last_name: { type: "string" },
          mobile_number: { type: "string", example: "+251900000000" },
          account_status: {
            type: "string",
            enum: ["active", "suspended", "deactivated"],
          },
          account_activation: {
            type: "string",
            enum: ["pending", "activated"],
          },
          roles: {
            type: "array",
            items: { type: "string", enum: ["admin", "dispatcher", "driver"] },
          },
        },
      },
      RoleTranslation: {
        type: "object",
        required: ["locale", "name"],
        properties: {
          locale: { type: "string", enum: ["en", "am"], example: "en" },
          name: { type: "string", example: "Administrator" },
          description: { type: "string", nullable: true, example: "Full platform access" },
        },
      },
      Role: {
        type: "object",
        description:
          "Role slug is language-neutral. Localized `name` and `description` are resolved from stored translations for the requested locale. Detail responses include the full `translations` array.",
        properties: {
          id: { type: "string", format: "uuid" },
          slug: { type: "string", example: "admin" },
          name: { type: "string", example: "Administrator" },
          description: { type: "string", nullable: true, example: "Full platform access" },
          locale: {
            type: "string",
            enum: ["en", "am"],
            example: "en",
            description: "Locale used to resolve `name` and `description`",
          },
          created_at: { type: "string", format: "date-time" },
          translations: {
            type: "array",
            description: "Included on role detail and create/update responses",
            items: { $ref: "#/components/schemas/RoleTranslation" },
          },
        },
      },
      AuthRole: {
        type: "object",
        properties: {
          user_id: { type: "string", format: "uuid" },
          role_id: { type: "string", format: "uuid" },
          assigned_at: { type: "string", format: "date-time" },
          user: { $ref: "#/components/schemas/User" },
          role: { $ref: "#/components/schemas/Role" },
        },
      },
      AuthTokenResponse: {
        type: "object",
        properties: {
          access_token: { type: "string" },
          refresh_token: { type: "string" },
          token_type: { type: "string", enum: ["Bearer"] },
          expires_in: { type: "integer", example: 900 },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      MessageResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
    },
    parameters: {
      Page: {
        name: "page",
        in: "query",
        schema: { type: "integer", minimum: 1, default: 1 },
        description: "Page number (1-based)",
      },
      Limit: {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        description: "Items per page (max 100)",
      },
      Locale: {
        name: "locale",
        in: "query",
        schema: { type: "string", enum: ["en", "am"], default: "en" },
        description: "Preferred language for localized role fields",
      },
      UserId: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
      RoleId: {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    },
    responses: {
      BadRequest: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
      },
      Unauthorized: {
        description: "Missing or invalid access token",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
      },
      Forbidden: {
        description: "Insufficient permissions",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
      },
      NotFound: {
        description: "Resource not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
      },
      Conflict: {
        description: "Duplicate value",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiErrorResponse" },
          },
        },
      },
    },
  },
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        description: "Returns API availability status.",
        responses: {
          "200": {
            description: "API is running",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: {
                        status: { type: "string", example: "ok" },
                      },
                    },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in",
        description: "Authenticate with email and password. Returns access and refresh tokens.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", format: "password", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Signed in successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { $ref: "#/components/schemas/AuthTokenResponse" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/token": {
      post: {
        tags: ["Auth"],
        summary: "Issue or refresh tokens",
        description:
          "OAuth-style token endpoint. Use `grant_type: password` to sign in, or `grant_type: refresh_token` to rotate tokens.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  {
                    type: "object",
                    required: ["grant_type", "email", "password"],
                    properties: {
                      grant_type: { type: "string", enum: ["password"] },
                      email: { type: "string", format: "email" },
                      password: { type: "string", format: "password" },
                    },
                  },
                  {
                    type: "object",
                    required: ["grant_type", "refresh_token"],
                    properties: {
                      grant_type: { type: "string", enum: ["refresh_token"] },
                      refresh_token: { type: "string" },
                    },
                  },
                ],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Tokens issued",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { $ref: "#/components/schemas/AuthTokenResponse" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Sign out",
        description: "Revokes the provided refresh token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refresh_token"],
                properties: {
                  refresh_token: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Logged out",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { $ref: "#/components/schemas/MessageResponse" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user",
        description: "Returns the authenticated user profile.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: {
                        user: { $ref: "#/components/schemas/User" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset",
        description:
          "Sends a password reset invitation if an active account exists. Always returns a generic success message.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: {
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Invitation processed",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { $ref: "#/components/schemas/MessageResponse" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password",
        description: "Sets a new password using a valid reset invitation token.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "password"],
                properties: {
                  token: { type: "string" },
                  password: { type: "string", format: "password", minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: { $ref: "#/components/schemas/MessageResponse" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
        },
      },
    },
    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "List users",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/Limit" },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search email, name, or mobile number",
          },
          {
            name: "account_status",
            in: "query",
            schema: { type: "string", enum: ["active", "suspended", "deactivated"] },
          },
          {
            name: "account_activation",
            in: "query",
            schema: { type: "string", enum: ["pending", "activated"] },
          },
        ],
        responses: {
          "200": {
            description: "Paginated user list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/User" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Create user",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "first_name", "last_name", "mobile_number"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  first_name: { type: "string" },
                  middle_name: { type: "string", nullable: true },
                  last_name: { type: "string" },
                  mobile_number: { type: "string" },
                  account_status: {
                    type: "string",
                    enum: ["active", "suspended", "deactivated"],
                  },
                  account_activation: {
                    type: "string",
                    enum: ["pending", "activated"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "User created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { user: { $ref: "#/components/schemas/User" } },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        responses: {
          "200": {
            description: "User details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { user: { $ref: "#/components/schemas/User" } },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update user",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  first_name: { type: "string" },
                  middle_name: { type: "string", nullable: true },
                  last_name: { type: "string" },
                  mobile_number: { type: "string" },
                  account_status: {
                    type: "string",
                    enum: ["active", "suspended", "deactivated"],
                  },
                  account_activation: {
                    type: "string",
                    enum: ["pending", "activated"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "User updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { user: { $ref: "#/components/schemas/User" } },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
      delete: {
        tags: ["Users"],
        summary: "Delete user",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        responses: {
          "200": {
            description: "User deleted",
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
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/users/{id}/account-status": {
      patch: {
        tags: ["Users"],
        summary: "Update account status",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["account_status"],
                properties: {
                  account_status: {
                    type: "string",
                    enum: ["active", "suspended", "deactivated"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Status updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { user: { $ref: "#/components/schemas/User" } },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/users/{id}/account-activation": {
      patch: {
        tags: ["Users"],
        summary: "Update account activation",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/UserId" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["account_activation"],
                properties: {
                  account_activation: {
                    type: "string",
                    enum: ["pending", "activated"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Activation updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { user: { $ref: "#/components/schemas/User" } },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/users/{id}/roles": {
      get: {
        tags: ["Users"],
        summary: "List user roles",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/UserId" },
          { $ref: "#/components/parameters/Locale" },
        ],
        responses: {
          "200": {
            description: "Roles assigned to the user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: {
                        roles: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Role" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      put: {
        tags: ["Users"],
        summary: "Replace user roles",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/UserId" },
          { $ref: "#/components/parameters/Locale" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role_ids"],
                properties: {
                  role_ids: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Roles replaced",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: {
                        roles: {
                          type: "array",
                          items: { $ref: "#/components/schemas/Role" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Users"],
        summary: "Assign role to user",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/UserId" },
          { $ref: "#/components/parameters/Locale" },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role_id"],
                properties: {
                  role_id: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Role assigned",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { role: { $ref: "#/components/schemas/Role" } },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/users/{id}/roles/{roleId}": {
      delete: {
        tags: ["Users"],
        summary: "Remove role from user",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/UserId" },
          {
            name: "roleId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Role removed",
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
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/roles": {
      get: {
        tags: ["Roles"],
        summary: "List roles",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/Limit" },
          { $ref: "#/components/parameters/Locale" },
          {
            name: "search",
            in: "query",
            schema: { type: "string" },
            description: "Search slug or translated name/description",
          },
        ],
        responses: {
          "200": {
            description: "Paginated role list",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Role" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Roles"],
        summary: "Create role",
        description: "Requires at least one translation, including `en`.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["slug", "translations"],
                properties: {
                  slug: { type: "string", example: "dispatcher" },
                  translations: {
                    type: "array",
                    minItems: 1,
                    items: { $ref: "#/components/schemas/RoleTranslation" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Role created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { role: { $ref: "#/components/schemas/Role" } },
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/BadRequest" },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/roles/slug/{slug}": {
      get: {
        tags: ["Roles"],
        summary: "Get role by slug",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string", example: "admin" },
          },
          { $ref: "#/components/parameters/Locale" },
        ],
        responses: {
          "200": {
            description: "Role details with all translations",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { role: { $ref: "#/components/schemas/Role" } },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/roles/{id}": {
      get: {
        tags: ["Roles"],
        summary: "Get role",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/RoleId" },
          { $ref: "#/components/parameters/Locale" },
        ],
        responses: {
          "200": {
            description: "Role details with all translations",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { role: { $ref: "#/components/schemas/Role" } },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Roles"],
        summary: "Update role",
        description: "Upserts any translations provided in the request body.",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/RoleId" }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  slug: { type: "string" },
                  translations: {
                    type: "array",
                    items: { $ref: "#/components/schemas/RoleTranslation" },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Role updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: { role: { $ref: "#/components/schemas/Role" } },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
      delete: {
        tags: ["Roles"],
        summary: "Delete role",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/RoleId" }],
        responses: {
          "200": {
            description: "Role deleted",
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
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/roles/{id}/users": {
      get: {
        tags: ["Roles"],
        summary: "List users with role",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/RoleId" }],
        responses: {
          "200": {
            description: "Users assigned to this role",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: {
                        users: {
                          type: "array",
                          items: { $ref: "#/components/schemas/User" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/auth-roles": {
      get: {
        tags: ["Auth Roles"],
        summary: "List role assignments",
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: "#/components/parameters/Page" },
          { $ref: "#/components/parameters/Limit" },
          { $ref: "#/components/parameters/Locale" },
          {
            name: "user_id",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "role_id",
            in: "query",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Paginated assignments",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "array",
                      items: { $ref: "#/components/schemas/AuthRole" },
                    },
                    pagination: { $ref: "#/components/schemas/PaginationMeta" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Auth Roles"],
        summary: "Assign role to user",
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: "#/components/parameters/Locale" }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["user_id", "role_id"],
                properties: {
                  user_id: { type: "string", format: "uuid" },
                  role_id: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Assignment created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: {
                        auth_role: { $ref: "#/components/schemas/AuthRole" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/auth-roles/{userId}/{roleId}": {
      get: {
        tags: ["Auth Roles"],
        summary: "Get role assignment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "roleId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          { $ref: "#/components/parameters/Locale" },
        ],
        responses: {
          "200": {
            description: "Assignment details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", enum: [true] },
                    data: {
                      type: "object",
                      properties: {
                        auth_role: { $ref: "#/components/schemas/AuthRole" },
                      },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Auth Roles"],
        summary: "Remove role assignment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "roleId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "Assignment removed",
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
          "401": { $ref: "#/components/responses/Unauthorized" },
          "403": { $ref: "#/components/responses/Forbidden" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
} as const;
