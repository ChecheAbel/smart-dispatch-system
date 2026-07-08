import { Router, type Request, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicDriverOption, toPublicVehicle } from "../mappers/vehicle.mapper";
import { userHasPermission } from "../models/permission.model";
import { listDrivers } from "../models/user.model";
import {
  countVehicles,
  createVehicle,
  deleteVehicle,
  findVehicleById,
  listVehicles,
  parseAssignedDriverUserId,
  parseVehicleStatus,
  updateVehicle,
} from "../models/vehicle.model";
import { findVehicleTypeById } from "../models/vehicle-type.model";
import { findVehicleClassById } from "../models/vehicle-class.model";
import { isVehicleTypeClassAllowed } from "../models/vehicle-type-class.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString, getString, parseBoolean } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parseYear(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const year = Math.trunc(value);
  if (year < 1900 || year > 2100) return undefined;
  return year;
}

function mapDriverAssignmentError(error: unknown) {
  if (!(error instanceof Error)) return null;

  switch (error.message) {
    case "DRIVER_NOT_FOUND":
      return "Driver not found.";
    case "USER_NOT_DRIVER":
      return "Selected user is not a driver.";
    case "DRIVER_NOT_ACTIVE":
      return "Selected driver must be active and activated.";
    default:
      return null;
  }
}

async function assertCanAssignVehicleDriver(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    sendError(res, "Unauthorized.", 401);
    return false;
  }

  const allowed = await userHasPermission(req.user.id, "vehicles.assign_driver");
  if (!allowed) {
    sendError(res, "Forbidden.", 403);
    return false;
  }

  return true;
}

router.get("/", requirePermission("vehicles.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      vehicleTypeId: getString(req.query.vehicle_type_id) || undefined,
      vehicleClassId: getString(req.query.vehicle_class_id) || undefined,
      status: parseVehicleStatus(req.query.status),
      assignedDriverUserId: getString(req.query.assigned_driver_user_id) || undefined,
      unassignedOnly: parseBoolean(req.query.unassigned_only),
      assignedOnly: parseBoolean(req.query.assigned_only),
    };

    const result = await paginate(
      pagination,
      () => countVehicles(filter),
      (skip, take) => listVehicles(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((vehicle) => toPublicVehicle(vehicle, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/driver-options", requirePermission("vehicles.assign_driver"), async (req: Request, res: Response) => {
  try {
    const search = getString(req.query.search) || undefined;
    const drivers = await listDrivers({ search });

    return sendSuccess(res, {
      drivers: drivers.map((driver) => toPublicDriverOption(driver)),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("vehicles.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const vehicle = await findVehicleById(req.params.id);
    if (!vehicle) {
      return sendError(res, "Vehicle not found.", 404);
    }

    return sendSuccess(res, {
      vehicle: toPublicVehicle(vehicle, { locale }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("vehicles.write"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const plateNumber = getString(req.body?.plate_number);
    const chassisNumber = getString(req.body?.chassis_number);
    const vehicleTypeId = getString(req.body?.vehicle_type_id);
    const vehicleClassId = getString(req.body?.vehicle_class_id);
    const status = parseVehicleStatus(req.body?.status);
    const year = parseYear(req.body?.year);
    const assignedDriverUserId = parseAssignedDriverUserId(req.body?.assigned_driver_user_id);

    if (assignedDriverUserId) {
      const canAssign = await assertCanAssignVehicleDriver(req, res);
      if (!canAssign) {
        return;
      }
    }

    if (!plateNumber) {
      return sendError(res, "Plate number is required.", 400);
    }

    if (!chassisNumber) {
      return sendError(res, "Chassis number is required.", 400);
    }

    if (!vehicleTypeId) {
      return sendError(res, "Vehicle type is required.", 400);
    }

    if (!vehicleClassId) {
      return sendError(res, "Vehicle class is required.", 400);
    }

    const vehicleType = await findVehicleTypeById(vehicleTypeId);
    if (!vehicleType) {
      return sendError(res, "Vehicle type not found.", 404);
    }

    const vehicleClass = await findVehicleClassById(vehicleClassId);
    if (!vehicleClass) {
      return sendError(res, "Vehicle class not found.", 404);
    }

    const typeClassAllowed = await isVehicleTypeClassAllowed(vehicleTypeId, vehicleClassId);
    if (!typeClassAllowed) {
      return sendError(res, "Selected vehicle class is not allowed for this vehicle type.", 400);
    }

    const vehicle = await createVehicle({
      plateNumber,
      chassisNumber,
      vehicleTypeId,
      vehicleClassId,
      assignedDriverUserId,
      make: getOptionalString(req.body?.make),
      model: getOptionalString(req.body?.model),
      year: year ?? null,
      status,
      notes: getOptionalString(req.body?.notes),
    });

    return sendSuccess(
      res,
      { vehicle: toPublicVehicle(vehicle, { locale }) },
      { status: 201 },
    );
  } catch (error) {
    const message = mapDriverAssignmentError(error);
    if (message) {
      return sendError(res, message, 400);
    }
    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("vehicles.write"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const existing = await findVehicleById(req.params.id);
    if (!existing) {
      return sendError(res, "Vehicle not found.", 404);
    }

    if (req.body?.assigned_driver_user_id !== undefined) {
      const assignedDriverUserId = parseAssignedDriverUserId(req.body.assigned_driver_user_id);
      const nextDriverId = assignedDriverUserId ?? null;
      const currentDriverId = existing.assignedDriverUserId ?? null;

      if (nextDriverId !== currentDriverId) {
        const canAssign = await assertCanAssignVehicleDriver(req, res);
        if (!canAssign) {
          return;
        }
      }
    }

    const vehicleTypeId = getOptionalString(req.body?.vehicle_type_id);
    const vehicleClassId = getOptionalString(req.body?.vehicle_class_id);
    if (vehicleTypeId) {
      const vehicleType = await findVehicleTypeById(vehicleTypeId);
      if (!vehicleType) {
        return sendError(res, "Vehicle type not found.", 404);
      }
    }

    if (vehicleClassId) {
      const vehicleClass = await findVehicleClassById(vehicleClassId);
      if (!vehicleClass) {
        return sendError(res, "Vehicle class not found.", 404);
      }
    }

    const resolvedVehicleTypeId = vehicleTypeId ?? existing.vehicleTypeId;
    const resolvedVehicleClassId = vehicleClassId ?? existing.vehicleClassId;
    const typeClassAllowed = await isVehicleTypeClassAllowed(
      resolvedVehicleTypeId,
      resolvedVehicleClassId,
    );
    if (!typeClassAllowed) {
      return sendError(res, "Selected vehicle class is not allowed for this vehicle type.", 400);
    }

    const assignedDriverUserId = parseAssignedDriverUserId(req.body?.assigned_driver_user_id);

    if (req.body?.chassis_number !== undefined && !getString(req.body?.chassis_number)) {
      return sendError(res, "Chassis number is required.", 400);
    }

    const vehicle = await updateVehicle(req.params.id, {
      plateNumber: getOptionalString(req.body?.plate_number) ?? undefined,
      chassisNumber: getOptionalString(req.body?.chassis_number),
      vehicleTypeId: vehicleTypeId ?? undefined,
      vehicleClassId: vehicleClassId ?? undefined,
      assignedDriverUserId,
      make: getOptionalString(req.body?.make),
      model: getOptionalString(req.body?.model),
      year: parseYear(req.body?.year),
      status: parseVehicleStatus(req.body?.status),
      notes: getOptionalString(req.body?.notes),
    });

    return sendSuccess(res, {
      vehicle: toPublicVehicle(vehicle, { locale }),
    });
  } catch (error) {
    const message = mapDriverAssignmentError(error);
    if (message) {
      return sendError(res, message, 400);
    }
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("vehicles.delete"), async (req: Request, res: Response) => {
  try {
    const vehicle = await findVehicleById(req.params.id);
    if (!vehicle) {
      return sendError(res, "Vehicle not found.", 404);
    }

    await deleteVehicle(req.params.id);
    return sendSuccess(res, { message: "Vehicle deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerVehicleRoutes(app: import("express").Express) {
  app.use("/api/vehicles", router);
}
