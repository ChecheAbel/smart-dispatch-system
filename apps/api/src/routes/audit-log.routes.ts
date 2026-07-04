import { Router, type Request, type Response } from "express";
import type { AuditAction } from "../generated/prisma";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicAuditLog } from "../mappers/audit-log.mapper";
import { countAuditLogs, findAuditLogById, listAuditLogs } from "../models/audit-log.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { getOptionalString, getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"));

const AUDIT_ACTIONS = new Set<AuditAction>([
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "assign",
  "revoke",
  "test",
]);

function parseAuditAction(value: unknown): AuditAction | undefined {
  const action = getOptionalString(value);
  if (!action) {
    return undefined;
  }

  return AUDIT_ACTIONS.has(action as AuditAction) ? (action as AuditAction) : undefined;
}

function parseDate(value: unknown) {
  const raw = getOptionalString(value);
  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

router.get("/", requirePermission("audit_logs.read"), async (req: Request, res: Response) => {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      module: getOptionalString(req.query.module) || undefined,
      action: parseAuditAction(req.query.action),
      actorUserId: getOptionalString(req.query.actor_user_id) || undefined,
      entityType: getOptionalString(req.query.entity_type) || undefined,
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
    };

    const result = await paginate(
      pagination,
      () => countAuditLogs(filter),
      (skip, take) => listAuditLogs(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((log) => toPublicAuditLog(log)),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("audit_logs.read"), async (req: Request, res: Response) => {
  try {
    const log = await findAuditLogById(req.params.id);
    if (!log) {
      return sendError(res, "Audit log entry not found.", 404);
    }

    return sendSuccess(res, { audit_log: toPublicAuditLog(log) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerAuditLogRoutes(app: import("express").Express) {
  app.use("/api/audit-logs", router);
}
