import { Router, type Request, type Response } from "express";
import type { InvoiceStatus } from "@smart-dispatch/types";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicInvoice, toPublicInvoices } from "../mappers/invoice.mapper";
import {
  countInvoices,
  findInvoiceById,
  listInvoices,
} from "../models/invoice.model";
import {
  generateInvoiceForEnrollment,
  generateInvoiceForTrip,
  issueInvoice,
  markInvoicePaid,
  voidInvoice,
} from "../services/invoice-generation.service";
import { runInvoiceAutomation } from "../services/invoice-automation.service";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString, getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

const INVOICE_STATUSES = new Set<InvoiceStatus>(["draft", "issued", "paid", "void"]);

router.use(authenticate, authorize("admin"), auditMutations());

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parseInvoiceStatus(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const status = value.trim() as InvoiceStatus;
  return INVOICE_STATUSES.has(status) ? status : undefined;
}

function parseBoolean(value: unknown) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  return false;
}

function mapGenerationError(error: unknown) {
  if (!(error instanceof Error)) return null;

  switch (error.message) {
    case "ENROLLMENT_NOT_FOUND":
      return { message: "Contract enrollment not found.", status: 404 };
    case "INVOICE_ALREADY_EXISTS":
      return { message: "An invoice already exists for this enrollment period.", status: 409 };
    case "NO_BILLABLE_TRIPS":
      return { message: "No completed unbilled trips found for this enrollment period.", status: 400 };
    case "FARE_PLAN_NOT_FOUND":
      return { message: "No active fare plan could be resolved for one or more trips.", status: 400 };
    case "PER_TRIP_SINGLE_INVOICE":
      return { message: "Per-trip contracts must be invoiced one trip at a time.", status: 400 };
    case "TRIP_NOT_BILLABLE":
      return { message: "Trip is not eligible for invoicing.", status: 400 };
    case "TRIP_ALREADY_INVOICED":
      return { message: "This trip has already been invoiced.", status: 409 };
    case "CONTRACT_NOT_PER_TRIP":
      return { message: "This contract uses period billing; generate by enrollment instead.", status: 400 };
    case "INVOICE_NOT_FOUND":
      return { message: "Invoice not found.", status: 404 };
    case "INVOICE_NOT_DRAFT":
      return { message: "Only draft invoices can be issued.", status: 400 };
    case "INVOICE_NOT_ISSUED":
      return { message: "Only issued invoices can be marked paid.", status: 400 };
    case "INVOICE_NOT_VOIDABLE":
      return { message: "Paid or void invoices cannot be voided.", status: 400 };
    default:
      return null;
  }
}

router.get("/", requirePermission("invoices.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getOptionalString(req.query.search) ?? undefined,
      status: parseInvoiceStatus(req.query.status),
      contractId: getOptionalString(req.query.contract_id) ?? undefined,
      requesterUserId: getOptionalString(req.query.requester_user_id) ?? undefined,
    };

    const result = await paginate(
      pagination,
      () => countInvoices(filter),
      (skip, take) => listInvoices(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      toPublicInvoices(result.data, { locale }),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/run-automation", requirePermission("invoices.write"), async (_req: Request, res: Response) => {
  try {
    const result = await runInvoiceAutomation();
    return sendSuccess(res, { result });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/generate", requirePermission("invoices.write"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const issue = parseBoolean(req.body?.issue);
    const notes = getOptionalString(req.body?.notes);
    const contractEnrollmentId = getString(req.body?.contract_enrollment_id);
    const rideRequestId = getString(req.body?.ride_request_id);

    if (!contractEnrollmentId && !rideRequestId) {
      return sendError(res, "Provide contract_enrollment_id or ride_request_id.", 400);
    }

    const invoice = contractEnrollmentId
      ? await generateInvoiceForEnrollment({
          contractEnrollmentId,
          issue,
          notes,
        })
      : await generateInvoiceForTrip(rideRequestId!, { issue });

    return sendSuccess(
      res,
      { invoice: toPublicInvoice(invoice, { locale }) },
      { status: 201 },
    );
  } catch (error) {
    const mapped = mapGenerationError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.status);
    }
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("invoices.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const invoice = await findInvoiceById(req.params.id);
    if (!invoice) {
      return sendError(res, "Invoice not found.", 404);
    }

    return sendSuccess(res, { invoice: toPublicInvoice(invoice, { locale }) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/:id/issue", requirePermission("invoices.write"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const invoice = await issueInvoice(req.params.id);
    return sendSuccess(res, { invoice: toPublicInvoice(invoice, { locale }) });
  } catch (error) {
    const mapped = mapGenerationError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.status);
    }
    return handleRouteError(res, error);
  }
});

router.post("/:id/mark-paid", requirePermission("invoices.write"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const invoice = await markInvoicePaid(req.params.id);
    return sendSuccess(res, { invoice: toPublicInvoice(invoice, { locale }) });
  } catch (error) {
    const mapped = mapGenerationError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.status);
    }
    return handleRouteError(res, error);
  }
});

router.post("/:id/void", requirePermission("invoices.write"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const invoice = await voidInvoice(req.params.id);
    return sendSuccess(res, { invoice: toPublicInvoice(invoice, { locale }) });
  } catch (error) {
    const mapped = mapGenerationError(error);
    if (mapped) {
      return sendError(res, mapped.message, mapped.status);
    }
    return handleRouteError(res, error);
  }
});

export function registerInvoiceRoutes(app: import("express").Express) {
  app.use("/api/invoices", router);
}
