import { Router, type Request, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicVehicleType } from "../mappers/vehicle-type.mapper";
import {
  countVehicleTypes,
  countVehiclesByTypeId,
  createVehicleType,
  deleteVehicleType,
  findVehicleTypeById,
  hasDefaultLocaleTranslation,
  listActiveVehicleTypes,
  listVehicleTypes,
  slugFromVehicleTypeTranslations,
  updateVehicleType,
} from "../models/vehicle-type.model";
import {
  listAllowedClassIdsForVehicleType,
  syncAllowedVehicleClasses,
  VehicleClassNotAvailableError,
  VehicleTypeClassInUseError,
} from "../models/vehicle-type-class.model";
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

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parsePassengerCapacity(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return Math.trunc(value);
}

function parseAllowedClassIds(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const classIds = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return [...new Set(classIds)];
}

function mapVehicleTypeClassSyncError(error: unknown) {
  if (error instanceof VehicleTypeClassInUseError) {
    return "Cannot remove a class that is still used by vehicles, fare plans, or ride requests.";
  }

  if (error instanceof VehicleClassNotAvailableError) {
    return "One or more selected vehicle classes are not available.";
  }

  return null;
}

router.get("/", requirePermission("vehicle_types.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      isActive: parseBoolean(req.query.is_active),
    };

    const result = await paginate(
      pagination,
      () => countVehicleTypes(filter),
      (skip, take) => listVehicleTypes(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((vehicleType) => toPublicVehicleType(vehicleType, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/active", requirePermission("vehicle_types.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const vehicleTypes = await listActiveVehicleTypes();

    return sendSuccess(res, {
      vehicle_types: vehicleTypes.map((vehicleType) =>
        toPublicVehicleType(vehicleType, { locale }),
      ),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("vehicle_types.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const vehicleType = await findVehicleTypeById(req.params.id);
    if (!vehicleType) {
      return sendError(res, "Vehicle type not found.", 404);
    }

    const allowedClassIds = await listAllowedClassIdsForVehicleType(req.params.id);

    return sendSuccess(res, {
      vehicle_type: {
        ...toPublicVehicleType(vehicleType, { locale, includeAllTranslations: true }),
        allowed_class_ids: allowedClassIds,
      },
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("vehicle_types.write"), async (req: Request, res: Response) => {
  try {
    const translations = getRoleTranslations(req.body?.translations);
    const passengerCapacity = parsePassengerCapacity(req.body?.passenger_capacity);
    const isActive = parseBoolean(req.body?.is_active);

    if (!translations.length) {
      return sendError(res, "At least one translation is required.", 400);
    }

    if (!hasDefaultLocaleTranslation(translations)) {
      return sendError(res, "An English (en) translation is required.", 400);
    }

    if (!slugFromVehicleTypeTranslations(translations)) {
      return sendError(res, "English name is required to generate a vehicle type identifier.", 400);
    }

    const allowedClassIds = parseAllowedClassIds(req.body?.allowed_class_ids);
    if (allowedClassIds === null) {
      return sendError(res, "Allowed vehicle classes must be an array of IDs.", 400);
    }

    const vehicleType = await createVehicleType({
      translations,
      passengerCapacity: passengerCapacity ?? null,
      isActive: isActive ?? true,
    });

    if (allowedClassIds) {
      try {
        await syncAllowedVehicleClasses(vehicleType.id, allowedClassIds);
      } catch (error) {
        const message = mapVehicleTypeClassSyncError(error);
        if (message) {
          return sendError(res, message, 400);
        }
        throw error;
      }
    }

    const syncedClassIds = await listAllowedClassIdsForVehicleType(vehicleType.id);

    return sendSuccess(
      res,
      {
        vehicle_type: {
          ...toPublicVehicleType(vehicleType, { includeAllTranslations: true }),
          allowed_class_ids: syncedClassIds,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "VEHICLE_TYPE_SLUG_REQUIRED") {
      return sendError(res, "English name is required to generate a vehicle type identifier.", 400);
    }

    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("vehicle_types.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findVehicleTypeById(req.params.id);
    if (!existing) {
      return sendError(res, "Vehicle type not found.", 404);
    }

    const translations = getRoleTranslations(req.body?.translations);
    const passengerCapacity = parsePassengerCapacity(req.body?.passenger_capacity);
    const isActive = parseBoolean(req.body?.is_active);
    const allowedClassIds = parseAllowedClassIds(req.body?.allowed_class_ids);

    if (allowedClassIds === null) {
      return sendError(res, "Allowed vehicle classes must be an array of IDs.", 400);
    }

    const vehicleType = await updateVehicleType(req.params.id, {
      translations: translations.length ? translations : undefined,
      passengerCapacity,
      isActive,
    });

    if (allowedClassIds) {
      try {
        await syncAllowedVehicleClasses(req.params.id, allowedClassIds);
      } catch (error) {
        const message = mapVehicleTypeClassSyncError(error);
        if (message) {
          return sendError(res, message, 400);
        }
        throw error;
      }
    }

    const syncedClassIds = await listAllowedClassIdsForVehicleType(req.params.id);

    return sendSuccess(res, {
      vehicle_type: {
        ...toPublicVehicleType(vehicleType, { includeAllTranslations: true }),
        allowed_class_ids: syncedClassIds,
      },
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("vehicle_types.delete"), async (req: Request, res: Response) => {
  try {
    const vehicleType = await findVehicleTypeById(req.params.id);
    if (!vehicleType) {
      return sendError(res, "Vehicle type not found.", 404);
    }

    const linkedVehicles = await countVehiclesByTypeId(req.params.id);
    if (linkedVehicles > 0) {
      return sendError(res, "Cannot delete a vehicle type that is assigned to vehicles.", 409);
    }

    await deleteVehicleType(req.params.id);
    return sendSuccess(res, { message: "Vehicle type deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerVehicleTypeRoutes(app: import("express").Express) {
  app.use("/api/vehicle-types", router);
}
