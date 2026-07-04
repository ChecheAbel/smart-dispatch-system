import type { Request } from "express";
import type { AuditAction } from "../generated/prisma";
import type { AuthenticatedRequest } from "../middleware/authenticate";
import { createAuditLog, type CreateAuditLogInput } from "../models/audit-log.model";

const SENSITIVE_KEYS = new Set([
  "password",
  "password_hash",
  "passwordHash",
  "smtp_password",
  "api_key",
  "api_secret",
  "auth_token",
  "api_token",
  "refresh_token",
  "access_token",
  "token",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeAuditValue(item));
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = "[redacted]";
      continue;
    }

    sanitized[key] = sanitizeAuditValue(nestedValue);
  }

  return sanitized;
}

function getRequestIp(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }

  return req.ip ?? null;
}

function getRequestPath(req: Request) {
  const baseUrl = req.baseUrl ?? "";
  const path = req.path ?? "";
  return `${baseUrl}${path}` || req.originalUrl || null;
}

function singularizeResource(segment: string) {
  if (segment.endsWith("ies")) {
    return `${segment.slice(0, -3)}y`;
  }

  if (segment.endsWith("s") && segment.length > 1) {
    return segment.slice(0, -1);
  }

  return segment;
}

function normalizeModule(segment: string) {
  return segment.replace(/-/g, "_");
}

function inferAction(method: string, segments: string[]): AuditAction {
  if (segments[0] === "auth" && method === "POST") {
    const authAction = segments[1];
    if (authAction === "login" || authAction === "token") {
      return "login";
    }
    if (authAction === "logout") {
      return "logout";
    }
  }

  if (segments[0] === "notifications" && segments[2] === "test") {
    return "test";
  }

  if (segments.includes("roles") && (method === "PUT" || method === "PATCH")) {
    return "assign";
  }

  if (method === "POST") {
    return "create";
  }

  if (method === "DELETE") {
    return "delete";
  }

  return "update";
}

function inferEntityLabel(body: unknown) {
  if (!isPlainObject(body)) {
    return null;
  }

  if (typeof body.email === "string" && body.email.trim()) {
    return body.email.trim();
  }

  if (typeof body.slug === "string" && body.slug.trim()) {
    return body.slug.trim();
  }

  if (typeof body.channel === "string" && body.channel.trim()) {
    return body.channel.trim();
  }

  const firstName = typeof body.first_name === "string" ? body.first_name.trim() : "";
  const lastName = typeof body.last_name === "string" ? body.last_name.trim() : "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || null;
}

function buildSummary(action: AuditAction, segments: string[], entityLabel: string | null) {
  const target = entityLabel ? ` (${entityLabel})` : "";

  if (segments[0] === "users" && segments[2] === "roles") {
    if (action === "delete") {
      return `Removed role from user${target}`;
    }
    if (action === "create") {
      return `Assigned role to user${target}`;
    }
    return `Updated user roles${target}`;
  }

  if (segments[0] === "users" && segments[2] === "account-status") {
    return `Changed user account status${target}`;
  }

  if (segments[0] === "users" && segments[2] === "account-activation") {
    return `Changed user activation status${target}`;
  }

  if (segments[0] === "roles" && segments[2] === "permissions") {
    return `Updated role permissions${target}`;
  }

  if (segments[0] === "notifications" && segments[2] === "test") {
    return "Sent test SMS";
  }

  if (segments[0] === "notifications" && segments[1]) {
    return `Updated ${segments[1]} notification settings`;
  }

  const actionPhrase: Record<AuditAction, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    login: "Signed in",
    logout: "Signed out",
    assign: "Assigned",
    revoke: "Revoked",
    test: "Sent test for",
  };

  const resource = singularizeResource(segments[0] ?? "item");

  if (action === "login" || action === "logout") {
    return `${actionPhrase[action]}${target}`;
  }

  return `${actionPhrase[action]} ${resource}${target}`;
}

export function inferAuditFromRequest(req: Request) {
  const requestPath = getRequestPath(req) ?? req.originalUrl;
  const segments = requestPath.replace(/^\/api\//, "").split("/").filter(Boolean);
  const resourceSegment = segments[0] ?? "system";
  const module = normalizeModule(resourceSegment);
  const action = inferAction(req.method, segments);
  const entityType =
    segments[0] === "notifications" && segments[1]
      ? singularizeResource(segments[1])
      : singularizeResource(resourceSegment);
  const entityId =
    typeof req.params.id === "string"
      ? req.params.id
      : typeof req.params.channel === "string"
        ? req.params.channel
        : null;
  const entityLabel = inferEntityLabel(req.body);

  return {
    action,
    module,
    entityType,
    entityId,
    entityLabel,
    summary: buildSummary(action, segments, entityLabel),
    metadata: sanitizeAuditValue({
      params: req.params,
      query: req.query,
      body: req.body,
    }) as Record<string, unknown>,
    ipAddress: getRequestIp(req),
    userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null,
    requestMethod: req.method,
    requestPath,
  };
}

export async function recordAuditLog(
  input: CreateAuditLogInput & { req?: Request | AuthenticatedRequest },
) {
  const { req, ...auditInput } = input;

  return createAuditLog({
    actorUserId:
      auditInput.actorUserId ??
      (req && "user" in req ? (req as AuthenticatedRequest).user?.id ?? null : null),
    action: auditInput.action,
    module: auditInput.module,
    entityType: auditInput.entityType,
    entityId: auditInput.entityId ?? null,
    entityLabel: auditInput.entityLabel ?? null,
    summary: auditInput.summary ?? null,
    metadata: auditInput.metadata ?? {},
    ipAddress: auditInput.ipAddress ?? (req ? getRequestIp(req) : null),
    userAgent:
      auditInput.userAgent ??
      (req && typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null),
    requestMethod: auditInput.requestMethod ?? req?.method ?? null,
    requestPath: auditInput.requestPath ?? (req ? getRequestPath(req) : null),
  });
}

export async function recordAuditFromRequest(req: AuthenticatedRequest) {
  const inferred = inferAuditFromRequest(req);

  return recordAuditLog({
    req,
    ...inferred,
  });
}
