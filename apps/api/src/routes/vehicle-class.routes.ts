import { Router, type Request, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicVehicleClass } from "../mappers/vehicle-class.mapper";
import {
  countVehicleClasses,
  countVehiclesByClassId,
  countFarePlansByClassId,
  createVehicleClass,
  deleteVehicleClass,
  findVehicleClassById,
  hasDefaultLocaleTranslation,
  listActiveVehicleClasses,
  listVehicleClasses,
  slugFromVehicleClassTranslations,
  updateVehicleClass,
} from "../models/vehicle-class.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getRoleTranslations, getString, parseBoolean } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

router.get("/", requirePermission("vehicle_classes.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      isActive: parseBoolean(req.query.is_active),
    };

    const result = await paginate(
      pagination,
      () => countVehicleClasses(filter),
      (skip, take) => listVehicleClasses(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((vehicleClass) => toPublicVehicleClass(vehicleClass, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/active", requirePermission("vehicle_classes.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const vehicleClasses = await listActiveVehicleClasses();

    return sendSuccess(res, {
      vehicle_classes: vehicleClasses.map((vehicleClass) =>
        toPublicVehicleClass(vehicleClass, { locale }),
      ),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("vehicle_classes.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const vehicleClass = await findVehicleClassById(req.params.id);
    if (!vehicleClass) {
      return sendError(res, "Vehicle class not found.", 404);
    }

    return sendSuccess(res, {
      vehicle_class: toPublicVehicleClass(vehicleClass, { locale, includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("vehicle_classes.write"), async (req: Request, res: Response) => {
  try {
    const translations = getRoleTranslations(req.body?.translations);
    const isActive = parseBoolean(req.body?.is_active);

    if (!translations.length) {
      return sendError(res, "At least one translation is required.", 400);
    }

    if (!hasDefaultLocaleTranslation(translations)) {
      return sendError(res, "An English (en) translation is required.", 400);
    }

    if (!slugFromVehicleClassTranslations(translations)) {
      return sendError(res, "English name is required to generate a vehicle class identifier.", 400);
    }

    const vehicleClass = await createVehicleClass({
      translations,
      isActive: isActive ?? true,
    });

    return sendSuccess(
      res,
      { vehicle_class: toPublicVehicleClass(vehicleClass, { includeAllTranslations: true }) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "VEHICLE_CLASS_SLUG_REQUIRED") {
      return sendError(res, "English name is required to generate a vehicle class identifier.", 400);
    }

    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("vehicle_classes.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findVehicleClassById(req.params.id);
    if (!existing) {
      return sendError(res, "Vehicle class not found.", 404);
    }

    const translations = getRoleTranslations(req.body?.translations);
    const isActive = parseBoolean(req.body?.is_active);

    const vehicleClass = await updateVehicleClass(req.params.id, {
      translations: translations.length ? translations : undefined,
      isActive,
    });

    return sendSuccess(res, {
      vehicle_class: toPublicVehicleClass(vehicleClass, { includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("vehicle_classes.delete"), async (req: Request, res: Response) => {
  try {
    const vehicleClass = await findVehicleClassById(req.params.id);
    if (!vehicleClass) {
      return sendError(res, "Vehicle class not found.", 404);
    }

    const linkedVehicles = await countVehiclesByClassId(req.params.id);
    if (linkedVehicles > 0) {
      return sendError(res, "Cannot delete a vehicle class that is assigned to vehicles.", 409);
    }

    const linkedFarePlans = await countFarePlansByClassId(req.params.id);
    if (linkedFarePlans > 0) {
      return sendError(res, "Cannot delete a vehicle class that is assigned to fare plans.", 409);
    }

    await deleteVehicleClass(req.params.id);
    return sendSuccess(res, { message: "Vehicle class deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerVehicleClassRoutes(app: import("express").Express) {
  app.use("/api/vehicle-classes", router);
}
