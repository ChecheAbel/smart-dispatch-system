import { Router, type Request, type Response } from "express";
import type {
  ContractBillingInterval,
  ContractStatus,
  LatePaymentType,
} from "@smart-dispatch/types";
import { isPercentLatePaymentType } from "@smart-dispatch/types";
import type { Prisma } from "../generated/prisma";
import { auditMutations } from "../middleware/audit-mutation";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import {
  toPublicContract,
  toPublicContracts,
} from "../mappers/contract.mapper";
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
import { findDefaultBookingPolicy } from "../models/booking-policy.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString, getString } from "../utils/validation";
import {
  handleRouteError,
  sendError,
  sendPaginatedSuccess,
  sendSuccess,
} from "../utils/response";

const router = Router();

const CONTRACT_STATUSES = new Set<ContractStatus>([
  "draft",
  "active",
  "expired",
  "cancelled",
]);
const CONTRACT_BILLING_INTERVALS = new Set<ContractBillingInterval>([
  "per_trip",
  "at_contract_end",
  "monthly",
  "quarterly",
  "annually",
]);
const LATE_PAYMENT_TYPES = new Set<LatePaymentType>([
  "none",
  "flat",
  "percent",
  "flat_per_day",
  "percent_per_day",
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
    .filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    )
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
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 365) {
    return null;
  }
  return parsed;
}

function parseLatePaymentType(value: unknown): LatePaymentType | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const type = value.trim() as LatePaymentType;
  return LATE_PAYMENT_TYPES.has(type) ? type : undefined;
}

function parseOptionalMoney(value: unknown) {
  if (value === null) return null;
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function resolveLatePaymentPolicy(
  type: LatePaymentType | undefined,
  fee: number | null | undefined,
  fallbackType: LatePaymentType = "none",
  fallbackFee: number | null = null,
): { type: LatePaymentType; fee: number | null; error: string | null } {
  const resolvedType = type ?? fallbackType;
  const resolvedFee = fee === undefined ? fallbackFee : fee;

  if (resolvedType === "none") {
    return { type: "none", fee: null, error: null };
  }

  if (resolvedFee == null) {
    return {
      type: resolvedType,
      fee: null,
      error:
        isPercentLatePaymentType(resolvedType)
          ? "Late payment percent is required."
          : "Late payment fee is required.",
    };
  }

  if (isPercentLatePaymentType(resolvedType) && (resolvedFee <= 0 || resolvedFee > 100)) {
    return {
      type: resolvedType,
      fee: resolvedFee,
      error: "Late payment percent must be greater than 0 and at most 100.",
    };
  }

  return { type: resolvedType, fee: resolvedFee, error: null };
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
    regionIds:
      body.region_ids !== undefined
        ? (parseUuidArray(body.region_ids) ?? [])
        : existingScope.regionIds,
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

async function resolveDefaultBookingPolicyId() {
  const policy = await findDefaultBookingPolicy();
  return policy?.id ?? null;
}

router.get(
  "/",
  requirePermission("contracts.read"),
  async (req: Request, res: Response) => {
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
  },
);

router.get(
  "/:id/enrollments",
  requirePermission("contracts.read"),
  async (req: Request, res: Response) => {
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
  },
);

router.get(
  "/:id",
  requirePermission("contracts.read"),
  async (req: Request, res: Response) => {
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
  },
);

router.post(
  "/",
  requirePermission("contracts.write"),
  async (req: AuthenticatedRequest, res: Response) => {
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

      const bookingPolicyId = await resolveDefaultBookingPolicyId();

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

      const paymentTermsRaw = req.body?.payment_terms_days;
      const paymentTermsDays = parseOptionalPaymentTermsDays(paymentTermsRaw);
      if (
        paymentTermsRaw !== undefined &&
        paymentTermsRaw !== null &&
        paymentTermsDays === null
      ) {
        return sendError(
          res,
          "Payment terms must be between 0 and 365 days.",
          400,
        );
      }

      const resolvedPaymentTermsDays = paymentTermsDays;
      if (resolvedPaymentTermsDays == null) {
        return sendError(
          res,
          "Payment terms are required for this billing interval.",
          400,
        );
      }

      const latePaymentType = parseLatePaymentType(req.body?.late_payment_type) ?? "none";
      if (req.body?.late_payment_type !== undefined && parseLatePaymentType(req.body?.late_payment_type) === undefined) {
        return sendError(res, "Enter a valid late payment penalty type.", 400);
      }
      const latePaymentFeeRaw = req.body?.late_payment_fee;
      const latePaymentFee =
        latePaymentFeeRaw === undefined ? undefined : parseOptionalMoney(latePaymentFeeRaw);
      if (latePaymentFeeRaw !== undefined && latePaymentFeeRaw !== null && latePaymentFee === null) {
        return sendError(res, "Enter a valid late payment amount.", 400);
      }
      const latePayment = resolveLatePaymentPolicy(latePaymentType, latePaymentFee);
      if (latePayment.error) {
        return sendError(res, latePayment.error, 400);
      }

      const contract = await createContract({
        title,
        status,
        farePlanId,
        bookingPolicyId,
        notes: getOptionalString(req.body?.notes),
        billingInterval,
        paymentTermsDays: resolvedPaymentTermsDays,
        latePaymentType: latePayment.type,
        latePaymentFee: latePayment.fee,
        regionIds: scope.regionIds,
        vehicleTypeIds: scope.vehicleTypeIds,
        vehicleClassIds: scope.vehicleClassIds,
        createdById: req.user?.id,
      });

      return sendSuccess(
        res,
        { contract: toPublicContract(contract) },
        { status: 201 },
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.patch(
  "/:id",
  requirePermission("contracts.write"),
  async (req: Request, res: Response) => {
    try {
      const existing = await findContractById(req.params.id);
      if (!existing) {
        return sendError(res, "Contract not found.", 404);
      }

      const farePlanId =
        req.body?.fare_plan_id !== undefined
          ? parseOptionalId(req.body.fare_plan_id)
          : undefined;

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

      const scope = scopeFieldsSent
        ? resolveContractScope(req.body ?? {}, existing)
        : null;
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

      const paymentTermsRaw = req.body?.payment_terms_days;
      const paymentTermsDays =
        paymentTermsRaw !== undefined
          ? parseOptionalPaymentTermsDays(paymentTermsRaw)
          : undefined;
      if (
        paymentTermsRaw !== undefined &&
        paymentTermsRaw !== null &&
        paymentTermsDays === null
      ) {
        return sendError(
          res,
          "Payment terms must be between 0 and 365 days.",
          400,
        );
      }

      const nextPaymentTermsDays =
        paymentTermsDays === undefined
          ? existing.paymentTermsDays
          : paymentTermsDays;

      if (nextPaymentTermsDays == null) {
        return sendError(
          res,
          "Payment terms are required for this billing interval.",
          400,
        );
      }

      if (req.body?.late_payment_type !== undefined && parseLatePaymentType(req.body?.late_payment_type) === undefined) {
        return sendError(res, "Enter a valid late payment penalty type.", 400);
      }
      const latePaymentType = parseLatePaymentType(req.body?.late_payment_type);
      const latePaymentFeeRaw = req.body?.late_payment_fee;
      const latePaymentFee =
        latePaymentFeeRaw === undefined ? undefined : parseOptionalMoney(latePaymentFeeRaw);
      if (latePaymentFeeRaw !== undefined && latePaymentFeeRaw !== null && latePaymentFee === null) {
        return sendError(res, "Enter a valid late payment amount.", 400);
      }
      const latePayment = resolveLatePaymentPolicy(
        latePaymentType,
        latePaymentFee,
        existing.latePaymentType,
        existing.latePaymentFee != null ? Number(existing.latePaymentFee) : null,
      );
      if (latePayment.error) {
        return sendError(res, latePayment.error, 400);
      }

      const bookingPolicyId = existing.bookingPolicyId
        ? undefined
        : await resolveDefaultBookingPolicyId();

      const contract = await updateContract(existing.id, {
        title: getOptionalString(req.body?.title) || undefined,
        status: parseContractStatus(req.body?.status),
        farePlanId,
        bookingPolicyId,
        notes:
          req.body?.notes !== undefined
            ? getOptionalString(req.body?.notes)
            : undefined,
        billingInterval,
        paymentTermsDays:
          paymentTermsDays === undefined ? undefined : paymentTermsDays,
        latePaymentType:
          req.body?.late_payment_type !== undefined || req.body?.late_payment_fee !== undefined
            ? latePayment.type
            : undefined,
        latePaymentFee:
          req.body?.late_payment_type !== undefined || req.body?.late_payment_fee !== undefined
            ? latePayment.fee
            : undefined,
        regionIds:
          req.body?.region_ids !== undefined ? scope?.regionIds : undefined,
        vehicleTypeIds:
          req.body?.vehicle_type_ids !== undefined
            ? scope?.vehicleTypeIds
            : undefined,
        vehicleClassIds:
          req.body?.vehicle_class_ids !== undefined
            ? scope?.vehicleClassIds
            : undefined,
      });

      return sendSuccess(res, {
        contract: toPublicContract(contract, {
          locale: getRequestLocale(req),
        }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.delete(
  "/:id",
  requirePermission("contracts.delete"),
  async (req: Request, res: Response) => {
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
  },
);

export function registerContractRoutes(app: import("express").Express) {
  app.use("/api/contracts", router);
}
