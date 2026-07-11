import { Router, type Request, type Response } from "express";
import type { ContractBillingInterval, ContractStatus } from "@smart-dispatch/types";
import type { Prisma } from "../generated/prisma";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicContract, toPublicContracts } from "../mappers/contract.mapper";
import {
  countContracts,
  createContract,
  deleteContract,
  findContractById,
  getContractScopeIds,
  listContracts,
  updateContract,
} from "../models/contract.model";
import { listEnrollmentsByContractId } from "../models/contract-enrollment.model";
import { toPublicContractEnrollments } from "../mappers/contract-enrollment.mapper";
import { findFarePlanById } from "../models/fare-plan.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString, getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

const CONTRACT_STATUSES = new Set<ContractStatus>(["draft", "active", "expired", "cancelled"]);
const CONTRACT_BILLING_INTERVALS = new Set<ContractBillingInterval>([
  "per_trip",
  "monthly",
  "quarterly",
  "annually",
]);

router.use(authenticate, authorize("admin"), auditMutations());

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parseContractStatus(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const status = value.trim() as ContractStatus;
  return CONTRACT_STATUSES.has(status) ? status : undefined;
}

function parseOptionalId(value: unknown) {
  if (value === null) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

function parseUuidArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function parseBillingInterval(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const interval = value.trim() as ContractBillingInterval;
  return CONTRACT_BILLING_INTERVALS.has(interval) ? interval : undefined;
}

function parseOptionalPaymentTermsDays(value: unknown) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 365) {
    return null;
  }
  return parsed;
}

function validateContractScope(scope: {
  regionIds: string[];
  vehicleTypeIds: string[];
  vehicleClassIds: string[];
}) {
  if (scope.regionIds.length === 0) {
    return "At least one region is required.";
  }

  if (scope.vehicleTypeIds.length === 0) {
    return "At least one vehicle type is required.";
  }

  if (scope.vehicleClassIds.length === 0) {
    return "At least one vehicle class is required.";
  }

  return null;
}

function resolveContractScope(
  body: Record<string, unknown>,
  existing: {
    regionIds: Prisma.JsonValue;
    vehicleTypeIds: Prisma.JsonValue;
    vehicleClassIds: Prisma.JsonValue;
  },
) {
  const existingScope = getContractScopeIds(existing);

  return {
    regionIds: body.region_ids !== undefined ? (parseUuidArray(body.region_ids) ?? []) : existingScope.regionIds,
    vehicleTypeIds:
      body.vehicle_type_ids !== undefined
        ? (parseUuidArray(body.vehicle_type_ids) ?? [])
        : existingScope.vehicleTypeIds,
    vehicleClassIds:
      body.vehicle_class_ids !== undefined
        ? (parseUuidArray(body.vehicle_class_ids) ?? [])
        : existingScope.vehicleClassIds,
  };
}

async function validateFarePlanId(farePlanId: string | null | undefined) {
  if (!farePlanId) return null;
  const farePlan = await findFarePlanById(farePlanId);
  if (!farePlan) {
    return "Fare plan not found.";
  }
  return null;
}

router.get("/", requirePermission("contracts.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getOptionalString(req.query.search) ?? undefined,
      status: parseContractStatus(req.query.status),
    };

    const result = await paginate(
      pagination,
      () => countContracts(filter),
      (skip, take) => listContracts(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      toPublicContracts(result.data, { locale }),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id/enrollments", requirePermission("contracts.read"), async (req: Request, res: Response) => {
  try {
    const contract = await findContractById(req.params.id);
    if (!contract) {
      return sendError(res, "Contract not found.", 404);
    }

    const enrollments = await listEnrollmentsByContractId(contract.id);

    return sendSuccess(res, {
      enrollments: toPublicContractEnrollments(enrollments),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("contracts.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const contract = await findContractById(req.params.id);
    if (!contract) {
      return sendError(res, "Contract not found.", 404);
    }

    return sendSuccess(res, {
      contract: toPublicContract(contract, { locale }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("contracts.write"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const title = getString(req.body?.title);
    const status = parseContractStatus(req.body?.status) ?? "draft";

    if (!title) {
      return sendError(res, "Contract title is required.", 400);
    }

    const farePlanId = parseOptionalId(req.body?.fare_plan_id);
    const farePlanError = await validateFarePlanId(farePlanId);
    if (farePlanError) {
      return sendError(res, farePlanError, 400);
    }

    const scope = {
      regionIds: parseUuidArray(req.body?.region_ids) ?? [],
      vehicleTypeIds: parseUuidArray(req.body?.vehicle_type_ids) ?? [],
      vehicleClassIds: parseUuidArray(req.body?.vehicle_class_ids) ?? [],
    };
    const scopeError = validateContractScope(scope);
    if (scopeError) {
      return sendError(res, scopeError, 400);
    }

    const billingInterval = parseBillingInterval(req.body?.billing_interval);
    if (!billingInterval) {
      return sendError(res, "Billing interval is required.", 400);
    }

    const paymentTermsDays = parseOptionalPaymentTermsDays(req.body?.payment_terms_days);
    if (req.body?.payment_terms_days !== undefined && paymentTermsDays === null) {
      return sendError(res, "Payment terms must be between 1 and 365 days.", 400);
    }

    if (billingInterval !== "per_trip" && paymentTermsDays == null) {
      return sendError(res, "Payment terms are required for this billing interval.", 400);
    }

    const contract = await createContract({
      title,
      status,
      farePlanId,
      notes: getOptionalString(req.body?.notes),
      billingInterval,
      paymentTermsDays,
      regionIds: scope.regionIds,
      vehicleTypeIds: scope.vehicleTypeIds,
      vehicleClassIds: scope.vehicleClassIds,
      createdById: req.user?.id,
    });

    return sendSuccess(res, { contract: toPublicContract(contract) }, { status: 201 });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("contracts.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findContractById(req.params.id);
    if (!existing) {
      return sendError(res, "Contract not found.", 404);
    }

    const farePlanId =
      req.body?.fare_plan_id !== undefined ? parseOptionalId(req.body.fare_plan_id) : undefined;

    if (farePlanId !== undefined) {
      const farePlanError = await validateFarePlanId(farePlanId);
      if (farePlanError) {
        return sendError(res, farePlanError, 400);
      }
    }

    const scopeFieldsSent =
      req.body?.region_ids !== undefined ||
      req.body?.vehicle_type_ids !== undefined ||
      req.body?.vehicle_class_ids !== undefined;

    const scope = scopeFieldsSent ? resolveContractScope(req.body ?? {}, existing) : null;
    if (scope) {
      const scopeError = validateContractScope(scope);
      if (scopeError) {
        return sendError(res, scopeError, 400);
      }
    }

    const billingInterval =
      req.body?.billing_interval !== undefined
        ? parseBillingInterval(req.body.billing_interval)
        : undefined;
    if (req.body?.billing_interval !== undefined && !billingInterval) {
      return sendError(res, "Enter a valid billing interval.", 400);
    }

    const paymentTermsDays =
      req.body?.payment_terms_days !== undefined
        ? parseOptionalPaymentTermsDays(req.body.payment_terms_days)
        : undefined;
    if (req.body?.payment_terms_days !== undefined && paymentTermsDays === null) {
      return sendError(res, "Payment terms must be between 1 and 365 days.", 400);
    }

    const nextBillingInterval = billingInterval ?? existing.billingInterval;
    const nextPaymentTermsDays =
      paymentTermsDays === undefined ? existing.paymentTermsDays : paymentTermsDays;

    if (nextBillingInterval !== "per_trip" && nextPaymentTermsDays == null) {
      return sendError(res, "Payment terms are required for this billing interval.", 400);
    }

    const contract = await updateContract(existing.id, {
      title: getOptionalString(req.body?.title) || undefined,
      status: parseContractStatus(req.body?.status),
      farePlanId,
      notes: req.body?.notes !== undefined ? getOptionalString(req.body?.notes) : undefined,
      billingInterval,
      paymentTermsDays,
      regionIds: req.body?.region_ids !== undefined ? scope?.regionIds : undefined,
      vehicleTypeIds: req.body?.vehicle_type_ids !== undefined ? scope?.vehicleTypeIds : undefined,
      vehicleClassIds: req.body?.vehicle_class_ids !== undefined ? scope?.vehicleClassIds : undefined,
    });

    return sendSuccess(res, {
      contract: toPublicContract(contract, {
        locale: getRequestLocale(req),
      }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("contracts.delete"), async (req: Request, res: Response) => {
  try {
    const contract = await findContractById(req.params.id);
    if (!contract) {
      return sendError(res, "Contract not found.", 404);
    }

    await deleteContract(contract.id);
    return sendSuccess(res, { message: "Contract deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerContractRoutes(app: import("express").Express) {
  app.use("/api/contracts", router);
}
