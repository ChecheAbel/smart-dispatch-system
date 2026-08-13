import { Router, type Request, type Response } from "express";
import { LateCancellationType } from "../generated/prisma";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicBookingPolicy } from "../mappers/booking-policy.mapper";
import {
  countBookingPolicies,
  countContractsByBookingPolicyId,
  createBookingPolicy,
  deleteBookingPolicy,
  findBookingPolicyById,
  hasDefaultLocaleTranslation,
  listActiveBookingPolicies,
  listBookingPolicies,
  slugFromBookingPolicyTranslations,
  updateBookingPolicy,
} from "../models/booking-policy.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getRoleTranslations, getString, parseBoolean } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate);

const LATE_CANCELLATION_TYPES = new Set<string>(Object.values(LateCancellationType));

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parseHours(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.trunc(value);
}

function parseLateCancellationType(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return LATE_CANCELLATION_TYPES.has(normalized)
    ? (normalized as LateCancellationType)
    : undefined;
}

function parseMoney(value: unknown) {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed * 100) / 100;
    }
  }
  return undefined;
}

router.get(
  "/active",
  requirePermission("booking_policies.read", "contracts.read", "contracts.write"),
  async (req: Request, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const policies = await listActiveBookingPolicies();

      return sendSuccess(res, {
        booking_policies: policies.map((policy) =>
          toPublicBookingPolicy(policy, { locale }),
        ),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.use(authorize("admin"), auditMutations());

router.get("/", requirePermission("booking_policies.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      isActive: parseBoolean(req.query.is_active),
    };

    const result = await paginate(
      pagination,
      () => countBookingPolicies(filter),
      (skip, take) => listBookingPolicies(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((policy) => toPublicBookingPolicy(policy, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("booking_policies.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const policy = await findBookingPolicyById(req.params.id);
    if (!policy) {
      return sendError(res, "Booking policy not found.", 404);
    }

    return sendSuccess(res, {
      booking_policy: toPublicBookingPolicy(policy, {
        locale,
        includeAllTranslations: true,
      }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("booking_policies.write"), async (req: Request, res: Response) => {
  try {
    const translations = getRoleTranslations(req.body?.translations);
    const minAdvanceBookingHours = parseHours(req.body?.min_advance_booking_hours);
    const maxAdvanceBookingHours = parseHours(req.body?.max_advance_booking_hours);
    const freeCancellationHours = parseHours(req.body?.free_cancellation_hours);
    const lateCancellationType = parseLateCancellationType(req.body?.late_cancellation_type);
    const lateCancellationFee = parseMoney(req.body?.late_cancellation_fee);
    const isActive = parseBoolean(req.body?.is_active);
    const currency =
      typeof req.body?.currency === "string" ? req.body.currency.trim().toUpperCase() : undefined;

    if (!translations.length) {
      return sendError(res, "At least one translation is required.", 400);
    }

    if (!hasDefaultLocaleTranslation(translations)) {
      return sendError(res, "An English (en) translation is required.", 400);
    }

    if (!slugFromBookingPolicyTranslations(translations)) {
      return sendError(res, "English name is required to generate a policy identifier.", 400);
    }

    if (
      req.body?.min_advance_booking_hours !== undefined &&
      minAdvanceBookingHours === undefined
    ) {
      return sendError(res, "Minimum advance booking hours must be a non-negative number.", 400);
    }

    if (
      req.body?.max_advance_booking_hours !== undefined &&
      maxAdvanceBookingHours === undefined
    ) {
      return sendError(res, "Maximum advance booking hours must be a non-negative number.", 400);
    }

    if (
      req.body?.free_cancellation_hours !== undefined &&
      freeCancellationHours === undefined
    ) {
      return sendError(res, "Free cancellation hours must be a non-negative number.", 400);
    }

    if (
      req.body?.late_cancellation_type !== undefined &&
      !lateCancellationType
    ) {
      return sendError(res, "Invalid late cancellation policy.", 400);
    }

    if (
      req.body?.late_cancellation_fee !== undefined &&
      lateCancellationFee === undefined
    ) {
      return sendError(res, "Late cancellation fee must be a non-negative number.", 400);
    }

    const resolvedMin = minAdvanceBookingHours ?? 0;
    const resolvedMax = maxAdvanceBookingHours ?? 720;
    if (resolvedMax < resolvedMin) {
      return sendError(
        res,
        "Maximum advance booking hours must be greater than or equal to the minimum.",
        400,
      );
    }

    const resolvedLateType = lateCancellationType ?? LateCancellationType.none;
    if (resolvedLateType === "charge_fee" && (lateCancellationFee ?? null) === null) {
      return sendError(res, "Late cancellation fee is required when charging a fee.", 400);
    }

    const policy = await createBookingPolicy({
      translations,
      minAdvanceBookingHours,
      maxAdvanceBookingHours,
      freeCancellationHours,
      lateCancellationType: resolvedLateType,
      lateCancellationFee:
        resolvedLateType === "charge_fee" ? (lateCancellationFee ?? null) : null,
      currency,
      isActive: isActive ?? true,
    });

    return sendSuccess(
      res,
      {
        booking_policy: toPublicBookingPolicy(policy, { includeAllTranslations: true }),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_POLICY_SLUG_REQUIRED") {
      return sendError(res, "English name is required to generate a policy identifier.", 400);
    }

    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("booking_policies.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findBookingPolicyById(req.params.id);
    if (!existing) {
      return sendError(res, "Booking policy not found.", 404);
    }

    const translations = getRoleTranslations(req.body?.translations);
    const minAdvanceBookingHours = parseHours(req.body?.min_advance_booking_hours);
    const maxAdvanceBookingHours = parseHours(req.body?.max_advance_booking_hours);
    const freeCancellationHours = parseHours(req.body?.free_cancellation_hours);
    const lateCancellationType = parseLateCancellationType(req.body?.late_cancellation_type);
    const lateCancellationFee = parseMoney(req.body?.late_cancellation_fee);
    const isActive = parseBoolean(req.body?.is_active);
    const currency =
      typeof req.body?.currency === "string" ? req.body.currency.trim().toUpperCase() : undefined;

    if (
      req.body?.min_advance_booking_hours !== undefined &&
      minAdvanceBookingHours === undefined
    ) {
      return sendError(res, "Minimum advance booking hours must be a non-negative number.", 400);
    }

    if (
      req.body?.max_advance_booking_hours !== undefined &&
      maxAdvanceBookingHours === undefined
    ) {
      return sendError(res, "Maximum advance booking hours must be a non-negative number.", 400);
    }

    if (
      req.body?.free_cancellation_hours !== undefined &&
      freeCancellationHours === undefined
    ) {
      return sendError(res, "Free cancellation hours must be a non-negative number.", 400);
    }

    if (
      req.body?.late_cancellation_type !== undefined &&
      !lateCancellationType
    ) {
      return sendError(res, "Invalid late cancellation policy.", 400);
    }

    if (
      req.body?.late_cancellation_fee !== undefined &&
      lateCancellationFee === undefined
    ) {
      return sendError(res, "Late cancellation fee must be a non-negative number.", 400);
    }

    const resolvedMin =
      minAdvanceBookingHours ?? existing.minAdvanceBookingHours;
    const resolvedMax =
      maxAdvanceBookingHours ?? existing.maxAdvanceBookingHours;
    if (resolvedMax < resolvedMin) {
      return sendError(
        res,
        "Maximum advance booking hours must be greater than or equal to the minimum.",
        400,
      );
    }

    const resolvedLateType =
      lateCancellationType ?? existing.lateCancellationType;
    const resolvedFee =
      req.body?.late_cancellation_fee !== undefined
        ? lateCancellationFee
        : lateCancellationFee === null
          ? null
          : existing.lateCancellationFee
            ? Number(existing.lateCancellationFee)
            : null;

    if (resolvedLateType === "charge_fee" && resolvedFee === null) {
      return sendError(res, "Late cancellation fee is required when charging a fee.", 400);
    }

    const policy = await updateBookingPolicy(req.params.id, {
      translations: translations.length ? translations : undefined,
      minAdvanceBookingHours,
      maxAdvanceBookingHours,
      freeCancellationHours,
      lateCancellationType,
      lateCancellationFee:
        resolvedLateType === "charge_fee"
          ? resolvedFee
          : lateCancellationType !== undefined || req.body?.late_cancellation_fee !== undefined
            ? null
            : undefined,
      currency,
      isActive,
    });

    return sendSuccess(res, {
      booking_policy: toPublicBookingPolicy(policy, { includeAllTranslations: true }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "BOOKING_POLICY_SLUG_REQUIRED") {
      return sendError(res, "English name is required to generate a policy identifier.", 400);
    }

    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("booking_policies.delete"), async (req: Request, res: Response) => {
  try {
    const policy = await findBookingPolicyById(req.params.id);
    if (!policy) {
      return sendError(res, "Booking policy not found.", 404);
    }

    const linkedContracts = await countContractsByBookingPolicyId(req.params.id);
    if (linkedContracts > 0) {
      return sendError(res, "Cannot delete a booking policy linked to contracts.", 409);
    }

    await deleteBookingPolicy(req.params.id);
    return sendSuccess(res, { message: "Booking policy deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerBookingPolicyRoutes(app: import("express").Express) {
  app.use("/api/booking-policies", router);
}
