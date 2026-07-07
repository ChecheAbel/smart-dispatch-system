import { Router, type Request, type Response } from "express";
import { PricingModel } from "../generated/prisma";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicFarePlan } from "../mappers/fare-plan.mapper";
import {
  countFarePlans,
  createFarePlan,
  deleteFarePlan,
  findFarePlanById,
  hasDefaultLocaleTranslation,
  listFarePlans,
  resolveFarePlan,
  slugFromFarePlanTranslations,
  updateFarePlan,
} from "../models/fare-plan.model";
import { isVehicleTypeClassAllowed } from "../models/vehicle-type-class.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import {
  getRoleTranslations,
  getString,
  parseBoolean,
} from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

const PRICING_MODELS = new Set<string>(Object.values(PricingModel));

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parsePricingModel(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  return PRICING_MODELS.has(normalized) ? (normalized as PricingModel) : undefined;
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

function parseOptionalId(value: unknown) {
  if (value === null) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}

async function validateVehicleTypeClassPair(
  vehicleTypeId: string | null | undefined,
  vehicleClassId: string | null | undefined,
) {
  if (!vehicleTypeId || !vehicleClassId) {
    return null;
  }

  const allowed = await isVehicleTypeClassAllowed(vehicleTypeId, vehicleClassId);
  if (!allowed) {
    return "Selected vehicle class is not allowed for this vehicle type.";
  }

  return null;
}

function parsePriority(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.trunc(value);
}

function parseFreeWaitingMinutes(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.trunc(value);
}

router.get("/", requirePermission("fare_plans.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      isActive: parseBoolean(req.query.is_active),
      pricingModel: parsePricingModel(req.query.pricing_model),
      vehicleTypeId: getString(req.query.vehicle_type_id) || undefined,
      vehicleClassId: getString(req.query.vehicle_class_id) || undefined,
      regionId: getString(req.query.region_id) || undefined,
    };

    const result = await paginate(
      pagination,
      () => countFarePlans(filter),
      (skip, take) => listFarePlans(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((farePlan) => toPublicFarePlan(farePlan, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/resolve", requirePermission("fare_plans.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const farePlan = await resolveFarePlan({
      vehicleTypeId: getString(req.query.vehicle_type_id) || null,
      vehicleClassId: getString(req.query.vehicle_class_id) || null,
      regionId: getString(req.query.region_id) || null,
    });

    if (!farePlan) {
      return sendError(res, "No matching fare plan found.", 404);
    }

    return sendSuccess(res, {
      fare_plan: toPublicFarePlan(farePlan, { locale }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("fare_plans.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const farePlan = await findFarePlanById(req.params.id);
    if (!farePlan) {
      return sendError(res, "Fare plan not found.", 404);
    }

    return sendSuccess(res, {
      fare_plan: toPublicFarePlan(farePlan, { locale, includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("fare_plans.write"), async (req: Request, res: Response) => {
  try {
    const translations = getRoleTranslations(req.body?.translations);
    const pricingModel = parsePricingModel(req.body?.pricing_model);
    const baseFare = parseMoney(req.body?.base_fare);
    const isActive = parseBoolean(req.body?.is_active);

    if (!translations.length) {
      return sendError(res, "At least one translation is required.", 400);
    }

    if (!hasDefaultLocaleTranslation(translations)) {
      return sendError(res, "An English (en) translation is required.", 400);
    }

    if (!slugFromFarePlanTranslations(translations)) {
      return sendError(res, "English name is required to generate a fare plan identifier.", 400);
    }

    if (!pricingModel) {
      return sendError(res, "A valid pricing model is required.", 400);
    }

    if (baseFare === undefined || baseFare === null) {
      return sendError(res, "Base fare is required.", 400);
    }

    const vehicleTypeId = parseOptionalId(req.body?.vehicle_type_id);
    const vehicleClassId = parseOptionalId(req.body?.vehicle_class_id);
    const pairError = await validateVehicleTypeClassPair(vehicleTypeId, vehicleClassId);
    if (pairError) {
      return sendError(res, pairError, 400);
    }

    const farePlan = await createFarePlan({
      translations,
      vehicleTypeId,
      vehicleClassId,
      regionId: parseOptionalId(req.body?.region_id),
      pricingModel,
      currency: getString(req.body?.currency) || "ETB",
      baseFare,
      perKmRate: parseMoney(req.body?.per_km_rate),
      perMinuteRate: parseMoney(req.body?.per_minute_rate),
      minimumFare: parseMoney(req.body?.minimum_fare),
      bookingFee: parseMoney(req.body?.booking_fee),
      freeWaitingMinutes: parseFreeWaitingMinutes(req.body?.free_waiting_minutes),
      waitingFeePerMinute: parseMoney(req.body?.waiting_fee_per_minute),
      priority: parsePriority(req.body?.priority) ?? 0,
      isActive: isActive ?? true,
    });

    return sendSuccess(
      res,
      { fare_plan: toPublicFarePlan(farePlan, { includeAllTranslations: true }) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "FARE_PLAN_SLUG_REQUIRED") {
      return sendError(res, "English name is required to generate a fare plan identifier.", 400);
    }

    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("fare_plans.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findFarePlanById(req.params.id);
    if (!existing) {
      return sendError(res, "Fare plan not found.", 404);
    }

    const translations = getRoleTranslations(req.body?.translations);
    const pricingModel = parsePricingModel(req.body?.pricing_model);
    const baseFare = parseMoney(req.body?.base_fare);
    const isActive = parseBoolean(req.body?.is_active);

    const vehicleTypeId = parseOptionalId(req.body?.vehicle_type_id);
    const vehicleClassId = parseOptionalId(req.body?.vehicle_class_id);
    const pairError = await validateVehicleTypeClassPair(
      vehicleTypeId ?? existing.vehicleTypeId,
      vehicleClassId ?? existing.vehicleClassId,
    );
    if (pairError) {
      return sendError(res, pairError, 400);
    }

    const farePlan = await updateFarePlan(req.params.id, {
      translations: translations.length ? translations : undefined,
      vehicleTypeId,
      vehicleClassId,
      regionId: parseOptionalId(req.body?.region_id),
      pricingModel,
      currency: getString(req.body?.currency) || undefined,
      baseFare: baseFare ?? undefined,
      perKmRate: parseMoney(req.body?.per_km_rate),
      perMinuteRate: parseMoney(req.body?.per_minute_rate),
      minimumFare: parseMoney(req.body?.minimum_fare),
      bookingFee: parseMoney(req.body?.booking_fee),
      freeWaitingMinutes: parseFreeWaitingMinutes(req.body?.free_waiting_minutes),
      waitingFeePerMinute: parseMoney(req.body?.waiting_fee_per_minute),
      priority: parsePriority(req.body?.priority),
      isActive,
    });

    return sendSuccess(res, {
      fare_plan: toPublicFarePlan(farePlan, { includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("fare_plans.delete"), async (req: Request, res: Response) => {
  try {
    const farePlan = await findFarePlanById(req.params.id);
    if (!farePlan) {
      return sendError(res, "Fare plan not found.", 404);
    }

    await deleteFarePlan(req.params.id);
    return sendSuccess(res, { message: "Fare plan deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerFarePlanRoutes(app: import("express").Express) {
  app.use("/api/fare-plans", router);
}
