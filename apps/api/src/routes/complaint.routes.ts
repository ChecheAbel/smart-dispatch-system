import { randomBytes } from "crypto";
import { Router, type Response } from "express";
import type { ComplaintCategory, ComplaintPriority, ComplaintStatus } from "../generated/prisma";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { auditMutations } from "../middleware/audit-mutation";
import { requirePermission } from "../middleware/require-permission";
import { toPublicComplaint } from "../mappers/complaint.mapper";
import {
  countComplaints,
  createComplaint,
  findComplaintById,
  findComplaintForRequester,
  getComplaintSummary,
  listComplaints,
  updateComplaint,
} from "../models/complaint.model";
import { prisma } from "../db/prisma";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { getOptionalString, getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();
const categories = new Set<ComplaintCategory>(["trip", "driver", "vehicle", "billing", "service", "other"]);
const priorities = new Set<ComplaintPriority>(["low", "medium", "high", "urgent"]);
const statuses = new Set<ComplaintStatus>(["submitted", "under_review", "in_progress", "resolved", "closed", "rejected"]);

function choice<T extends string>(value: unknown, allowed: Set<T>): T | undefined {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : undefined;
}

function referenceNumber() {
  return `CMP-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

router.use(authenticate, auditMutations());

router.get("/mine/summary", requirePermission("customer_complaints.read"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    return sendSuccess(res, { summary: await getComplaintSummary(req.user!.id) });
  } catch (error) { return handleRouteError(res, error); }
});

router.get("/mine", requirePermission("customer_complaints.read"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filters = {
      requesterUserId: req.user!.id,
      search: getOptionalString(req.query.search) ?? undefined,
      status: choice(req.query.status, statuses),
      category: choice(req.query.category, categories),
    };
    const result = await paginate(pagination, () => countComplaints(filters), (skip, take) => listComplaints(filters, { skip, take }));
    return sendPaginatedSuccess(res, result.data.map(toPublicComplaint), result.pagination);
  } catch (error) { return handleRouteError(res, error); }
});

router.post("/", requirePermission("customer_complaints.write"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = choice(req.body?.category, categories);
    const subject = getString(req.body?.subject);
    const description = getString(req.body?.description);
    const rideRequestId = getOptionalString(req.body?.ride_request_id);
    if (!category || !subject || !description) return sendError(res, "Category, subject, and description are required.", 400);
    if (subject.length > 200 || description.length > 2000) return sendError(res, "Subject or description is too long.", 400);
    if (rideRequestId) {
      const ride = await prisma.rideRequest.findFirst({ where: { id: rideRequestId, requesterUserId: req.user!.id }, select: { id: true } });
      if (!ride) return sendError(res, "Ride request not found.", 404);
    }
    const complaint = await createComplaint({ referenceNumber: referenceNumber(), requesterUserId: req.user!.id, rideRequestId, category, subject, description });
    return sendSuccess(res, { complaint: toPublicComplaint(complaint) }, { status: 201 });
  } catch (error) { return handleRouteError(res, error); }
});

router.get("/admin/summary", requirePermission("complaints.read"), async (_req, res) => {
  try { return sendSuccess(res, { summary: await getComplaintSummary() }); }
  catch (error) { return handleRouteError(res, error); }
});

router.get("/admin", requirePermission("complaints.read"), async (req, res) => {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filters = {
      search: getOptionalString(req.query.search) ?? undefined,
      status: choice(req.query.status, statuses),
      priority: choice(req.query.priority, priorities),
      category: choice(req.query.category, categories),
    };
    const result = await paginate(pagination, () => countComplaints(filters), (skip, take) => listComplaints(filters, { skip, take }));
    return sendPaginatedSuccess(res, result.data.map(toPublicComplaint), result.pagination);
  } catch (error) { return handleRouteError(res, error); }
});

router.patch("/admin/:id", requirePermission("complaints.write"), async (req, res) => {
  try {
    const existing = await findComplaintById(req.params.id);
    if (!existing) return sendError(res, "Complaint not found.", 404);
    const status = req.body?.status === undefined ? undefined : choice(req.body.status, statuses);
    const priority = req.body?.priority === undefined ? undefined : choice(req.body.priority, priorities);
    if (req.body?.status !== undefined && !status) return sendError(res, "Invalid complaint status.", 400);
    if (req.body?.priority !== undefined && !priority) return sendError(res, "Invalid complaint priority.", 400);
    const assignedToUserId = req.body?.assigned_to_user_id === undefined ? undefined : getOptionalString(req.body.assigned_to_user_id);
    if (assignedToUserId) {
      const assignee = await prisma.user.findUnique({ where: { id: assignedToUserId }, select: { id: true } });
      if (!assignee) return sendError(res, "Assigned user not found.", 404);
    }
    const complaint = await updateComplaint(existing.id, {
      status,
      priority,
      assignedToUserId,
      adminResponse: req.body?.admin_response === undefined ? undefined : getOptionalString(req.body.admin_response),
      resolvedAt: status && ["resolved", "closed"].includes(status) ? new Date() : status ? null : undefined,
    });
    return sendSuccess(res, { complaint: toPublicComplaint(complaint) });
  } catch (error) { return handleRouteError(res, error); }
});

router.get("/:id", requirePermission("customer_complaints.read"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const complaint = await findComplaintForRequester(req.params.id, req.user!.id);
    if (!complaint) return sendError(res, "Complaint not found.", 404);
    return sendSuccess(res, { complaint: toPublicComplaint(complaint) });
  } catch (error) { return handleRouteError(res, error); }
});

export function registerComplaintRoutes(app: import("express").Express) {
  app.use("/api/complaints", router);
}
