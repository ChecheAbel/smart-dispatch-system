import { Router, type Response } from "express";
import type { CustomerVisibleInvoiceStatus } from "@smart-dispatch/types";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { requirePermission } from "../middleware/require-permission";
import {
  toCustomerContractEnrollment,
  toCustomerContractEnrollments,
  toCustomerInvoice,
  toCustomerInvoices,
} from "../mappers/customer-billing.mapper";
import {
  countEnrollmentsForRequester,
  findEnrollmentForRequester,
  getEnrollmentSummaryForRequester,
  listEnrollmentsForRequester,
} from "../models/contract-enrollment.model";
import {
  countCustomerInvoices,
  findInvoiceForRequester,
  listCustomerInvoices,
} from "../models/invoice.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";
import { getCustomerPaymentOptions } from "../config/customer-payment-options";
import {
  markInvoicePaidForRequester,
  markInvoicesPaidForRequester,
} from "../services/invoice-generation.service";
import type { CustomerPaymentMethodId } from "@smart-dispatch/types";

const router = Router();

const CUSTOMER_INVOICE_STATUSES = new Set<CustomerVisibleInvoiceStatus>(["issued", "paid", "void"]);

router.use(authenticate);

function getRequestLocale(req: AuthenticatedRequest) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parseCustomerInvoiceStatus(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const status = value.trim() as CustomerVisibleInvoiceStatus;
  return CUSTOMER_INVOICE_STATUSES.has(status) ? status : undefined;
}

router.get(
  "/contract-enrollments",
  requirePermission("customer_contracts.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const pagination = parsePaginationQuery(req.query);
      const search = getOptionalString(req.query.search) ?? undefined;

      const result = await paginate(
        pagination,
        () => countEnrollmentsForRequester(userId, search),
        (skip, take) => listEnrollmentsForRequester(userId, { skip, take }, search),
      );

      return sendPaginatedSuccess(
        res,
        toCustomerContractEnrollments(result.data),
        result.pagination,
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/contract-enrollments/summary",
  requirePermission("customer_contracts.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      return sendSuccess(res, {
        summary: await getEnrollmentSummaryForRequester(userId),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/contract-enrollments/:id",
  requirePermission("customer_contracts.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const enrollment = await findEnrollmentForRequester(req.params.id, userId);
      if (!enrollment) {
        return sendError(res, "Contract enrollment not found.", 404);
      }

      return sendSuccess(res, {
        contract_enrollment: toCustomerContractEnrollment(enrollment),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/invoices",
  requirePermission("customer_invoices.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const pagination = parsePaginationQuery(req.query);
      const filters = {
        search: getOptionalString(req.query.search) ?? undefined,
        status: parseCustomerInvoiceStatus(req.query.status),
      };

      const result = await paginate(
        pagination,
        () => countCustomerInvoices(userId, filters),
        (skip, take) => listCustomerInvoices(userId, filters, { skip, take }),
      );

      return sendPaginatedSuccess(
        res,
        toCustomerInvoices(result.data, { locale }),
        result.pagination,
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/invoices/:id",
  requirePermission("customer_invoices.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const invoice = await findInvoiceForRequester(req.params.id, userId);
      if (!invoice) {
        return sendError(res, "Invoice not found.", 404);
      }

      return sendSuccess(res, {
        invoice: toCustomerInvoice(invoice, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/billing/payment-options",
  requirePermission("customer_invoices.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.id) {
        return sendError(res, "Unauthorized.", 401);
      }

      return sendSuccess(res, {
        payment_options: getCustomerPaymentOptions(),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

function parsePaymentMethod(value: unknown): CustomerPaymentMethodId | null {
  if (value === "telebirr" || value === "cbe_birr") {
    return value;
  }
  return null;
}

function mapCustomerPaymentError(error: unknown) {
  if (!(error instanceof Error)) return null;

  switch (error.message) {
    case "INVOICE_NOT_FOUND":
      return { message: "Invoice not found.", status: 404 };
    case "INVOICE_NOT_ISSUED":
      return { message: "Only outstanding invoices can be marked as paid.", status: 409 };
    case "INVOICE_IDS_REQUIRED":
      return { message: "Select at least one invoice to pay.", status: 400 };
    case "INVOICE_CURRENCY_MISMATCH":
      return { message: "Selected invoices must share the same currency.", status: 409 };
    default:
      return null;
  }
}

function parseInvoiceIds(value: unknown) {
  if (!Array.isArray(value)) return null;
  const ids = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : null;
}

router.post(
  "/invoices/confirm-payments",
  requirePermission("customer_invoices.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const paymentMethod = parsePaymentMethod(req.body?.payment_method);
      if (!paymentMethod) {
        return sendError(res, "Invalid payment method.", 400);
      }

      const invoiceIds = parseInvoiceIds(req.body?.invoice_ids);
      if (!invoiceIds) {
        return sendError(res, "invoice_ids must be a non-empty array.", 400);
      }

      const invoices = await markInvoicesPaidForRequester(invoiceIds, userId, paymentMethod);

      return sendSuccess(res, {
        invoices: toCustomerInvoices(invoices, { locale }),
      });
    } catch (error) {
      const mapped = mapCustomerPaymentError(error);
      if (mapped) {
        return sendError(res, mapped.message, mapped.status);
      }
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/invoices/:id/confirm-payment",
  requirePermission("customer_invoices.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const paymentMethod = parsePaymentMethod(req.body?.payment_method);
      if (!paymentMethod) {
        return sendError(res, "Invalid payment method.", 400);
      }

      await markInvoicePaidForRequester(req.params.id, userId, paymentMethod);

      const invoice = await findInvoiceForRequester(req.params.id, userId);
      if (!invoice) {
        return sendError(res, "Invoice not found.", 404);
      }

      return sendSuccess(res, {
        invoice: toCustomerInvoice(invoice, { locale }),
      });
    } catch (error) {
      const mapped = mapCustomerPaymentError(error);
      if (mapped) {
        return sendError(res, mapped.message, mapped.status);
      }
      return handleRouteError(res, error);
    }
  },
);

export function registerCustomerBillingRoutes(app: import("express").Express) {
  app.use("/api/me", router);
}
