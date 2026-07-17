import multer from "multer";
import { Router, type Request, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicDriverOption, toPublicVehicle } from "../mappers/vehicle.mapper";
import {
  toPublicVehicleHistoryEvent,
  toPublicVehicleFuelLog,
  toPublicVehicleFuelLogs,
  toPublicVehicleMaintenanceLog,
} from "../mappers/vehicle-ops.mapper";
import { userHasPermission } from "../models/permission.model";
import { listDrivers } from "../models/user.model";
import {
  countVehicles,
  createVehicle,
  deleteVehicle,
  findVehicleById,
  getVehicleComplianceSummary,
  listVehicles,
  parseAssignedDriverUserId,
  parseVehicleComplianceStatus,
  parseVehicleComplianceType,
  parseVehicleStatus,
  updateVehicle,
} from "../models/vehicle.model";
import {
  buildVehicleFuelPreviousOdometerMap,
  countOpenVehicleMaintenance,
  countVehicleFuelLogs,
  countVehicleHistoryEvents,
  countVehicleMaintenanceLogs,
  createVehicleFuelLog,
  createVehicleHistoryEvent,
  createVehicleMaintenanceLog,
  findVehicleFuelLogById,
  findVehicleMaintenanceLogById,
  isOpenMaintenanceStatus,
  listVehicleFuelLogs,
  listVehicleHistoryEvents,
  listVehicleMaintenanceLogs,
  parseVehicleFuelType,
  parseVehicleMaintenanceStatus,
  updateVehicleFuelLog,
  updateVehicleMaintenanceLog,
} from "../models/vehicle-ops.model";
import { VehicleFuelLogSource, VehicleHistoryEventType, VehicleStatus } from "../generated/prisma";
import { resolveMaintenanceWorkTypeId } from "../models/maintenance-work-type.model";
import { findVehicleTypeById, listVehicleTypes } from "../models/vehicle-type.model";
import { findVehicleClassById, listVehicleClasses } from "../models/vehicle-class.model";
import { listBusyAssignedVehicleIds } from "../models/ride-request.model";
import { toPublicVehicleLocationSnapshot } from "../mappers/vehicle-location.mapper";
import { toPublicVehicleType } from "../mappers/vehicle-type.mapper";
import { toPublicVehicleClass } from "../mappers/vehicle-class.mapper";
import { isVehicleTypeClassAllowed } from "../models/vehicle-type-class.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { buildVehiclePhotoUrl, vehiclePhotoUpload } from "../utils/vehicle-photo-upload";
import { getOptionalString, getString, getStringArray, parseBoolean } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.get("/public", async (req: Request, res: Response) => {
  try {
    const locale = parseLocale(req.query, req.headers["accept-language"]);
    const [vehicles, types, classes, busyVehicleIds] = await Promise.all([
      listVehicles({}, { take: 1000 }),
      listVehicleTypes({}),
      listVehicleClasses({}),
      listBusyAssignedVehicleIds(),
    ]);
    const busyVehicleIdSet = new Set(busyVehicleIds);

    return sendSuccess(res, {
      vehicles: vehicles.map((v) =>
        toPublicVehicle(v, {
          locale,
          isAvailableNow: v.status === "active" && !busyVehicleIdSet.has(v.id),
        }),
      ),
      types: types.map((t) => toPublicVehicleType(t, { locale })),
      classes: classes.map((c) => toPublicVehicleClass(c, { locale })),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.use(authenticate, authorize("admin"), auditMutations());

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parseYear(value: unknown) {
  if (value === null) return null;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : undefined;
  if (parsed === undefined || !Number.isFinite(parsed)) return undefined;
  const year = Math.trunc(parsed);
  if (year < 1900 || year > 2100) return undefined;
  return year;
}

function parseOptionalDate(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parseOptionalNumber(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseLoggedAt(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed.includes("T") ? trimmed : `${trimmed}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function parsePositiveInteger(value: unknown) {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined || parsed === null) return undefined;
  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : undefined;
}

function parsePositiveQuantity(value: unknown) {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined || parsed === null) return undefined;
  return parsed > 0 ? parsed : undefined;
}

function parseComplianceBody(body: Record<string, unknown>) {
  return {
    insuranceProvider: getOptionalString(body.insurance_provider),
    insurancePolicyNumber: getOptionalString(body.insurance_policy_number),
    insuranceIssuedAt: parseOptionalDate(body.insurance_issued_at),
    insuranceExpiresAt: parseOptionalDate(body.insurance_expires_at),
    insuranceNotes: getOptionalString(body.insurance_notes),
    inspectionCenter: getOptionalString(body.inspection_center),
    inspectionCertificateNumber: getOptionalString(body.inspection_certificate_number),
    inspectionPerformedAt: parseOptionalDate(body.inspection_performed_at),
    inspectionExpiresAt: parseOptionalDate(body.inspection_expires_at),
    inspectionNotes: getOptionalString(body.inspection_notes),
    registrationExpiresAt: parseOptionalDate(body.registration_expires_at),
  };
}

const COMPLIANCE_ONLY_PATCH_KEYS = new Set([
  "insurance_provider",
  "insurance_policy_number",
  "insurance_issued_at",
  "insurance_expires_at",
  "insurance_notes",
  "inspection_center",
  "inspection_certificate_number",
  "inspection_performed_at",
  "inspection_expires_at",
  "inspection_notes",
  "registration_expires_at",
]);

async function assertCanPatchVehicle(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    sendError(res, "Unauthorized.", 401);
    return false;
  }

  const hasVehicleWrite = await userHasPermission(req.user.id, "vehicles.write");
  if (hasVehicleWrite) {
    return true;
  }

  const body = req.body ?? {};
  const disallowedKeys = Object.keys(body).filter((key) => !COMPLIANCE_ONLY_PATCH_KEYS.has(key));
  if (disallowedKeys.length > 0) {
    sendError(res, "You can only update insurance and inspection fields.", 403);
    return false;
  }

  return true;
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

router.get("/", requirePermission("vehicles.read", "compliance.read"), async (req: Request, res: Response) => {
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
      complianceType: parseVehicleComplianceType(req.query.compliance_type),
      complianceStatus: parseVehicleComplianceStatus(req.query.compliance_status),
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

router.get("/compliance/summary", requirePermission("compliance.read", "vehicles.read"), async (_req: Request, res: Response) => {
  try {
    const summary = await getVehicleComplianceSummary();
    return sendSuccess(res, { summary });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("vehicles.read", "compliance.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const vehicle = await findVehicleById(req.params.id);
    if (!vehicle) {
      return sendError(res, "Vehicle not found.", 404);
    }

    const openMaintenanceCount = await countOpenVehicleMaintenance(vehicle.id);

    return sendSuccess(res, {
      vehicle: toPublicVehicle(vehicle, { locale, openMaintenanceCount }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id/location", requirePermission("vehicles.read"), async (req: Request, res: Response) => {
  try {
    const vehicle = await findVehicleById(req.params.id);
    if (!vehicle) {
      return sendError(res, "Vehicle not found.", 404);
    }

    const snapshot = await findVehicleLocationByVehicleId(vehicle.id);

    return sendSuccess(res, {
      location: snapshot ? toPublicVehicleLocationSnapshot(snapshot) : null,
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id/history", requirePermission("vehicles.read"), async (req: Request, res: Response) => {
  try {
    const vehicle = await findVehicleById(req.params.id);
    if (!vehicle) {
      return sendError(res, "Vehicle not found.", 404);
    }

    const pagination = parsePaginationQuery(req.query);
    const result = await paginate(
      pagination,
      () => countVehicleHistoryEvents(vehicle.id),
      (skip, take) => listVehicleHistoryEvents(vehicle.id, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((event) => toPublicVehicleHistoryEvent(event)),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get(
  "/:id/maintenance",
  requirePermission("vehicles.read"),
  async (req: Request, res: Response) => {
    try {
      const vehicle = await findVehicleById(req.params.id);
      if (!vehicle) {
        return sendError(res, "Vehicle not found.", 404);
      }

      const pagination = parsePaginationQuery(req.query);
      const status = parseVehicleMaintenanceStatus(req.query.status);
      const filters = { status };
      const result = await paginate(
        pagination,
        () => countVehicleMaintenanceLogs(vehicle.id, filters),
        (skip, take) => listVehicleMaintenanceLogs(vehicle.id, { skip, take, ...filters }),
      );

      return sendPaginatedSuccess(
        res,
        result.data.map((log) =>
          toPublicVehicleMaintenanceLog(log, { locale: getRequestLocale(req) }),
        ),
        result.pagination,
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/:id/maintenance",
  requirePermission("vehicles.write"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const vehicle = await findVehicleById(req.params.id);
      if (!vehicle) {
        return sendError(res, "Vehicle not found.", 404);
      }

      const workTypeId = await resolveMaintenanceWorkTypeId({
        workTypeId: req.body?.work_type_id,
        workTypeSlug: req.body?.work_type_slug,
        type: req.body?.type,
      });
      const status = parseVehicleMaintenanceStatus(req.body?.status);
      const title = getString(req.body?.title);

      if (!workTypeId) {
        return sendError(res, "A valid maintenance work type is required.", 400);
      }

      if (!title) {
        return sendError(res, "Maintenance title is required.", 400);
      }

      const log = await createVehicleMaintenanceLog({
        vehicleId: vehicle.id,
        workTypeId,
        status,
        title,
        description: getOptionalString(req.body?.description),
        vendor: getOptionalString(req.body?.vendor),
        costAmount: parseOptionalNumber(req.body?.cost_amount),
        odometerKm: parseOptionalNumber(req.body?.odometer_km),
        startedAt: parseOptionalDate(req.body?.started_at) ?? null,
        completedAt: parseOptionalDate(req.body?.completed_at) ?? null,
        nextDueAt: parseOptionalDate(req.body?.next_due_at) ?? null,
        nextDueKm: parseOptionalNumber(req.body?.next_due_km),
        createdById: req.user?.id,
      });

      await createVehicleHistoryEvent({
        vehicleId: vehicle.id,
        eventType: VehicleHistoryEventType.maintenance_opened,
        summary: `Maintenance opened: ${log.title}`,
        actorUserId: req.user?.id,
        metadata: {
          maintenance_id: log.id,
          work_type_id: log.workTypeId,
          work_type_slug: log.workType.slug,
          status: log.status,
        },
      });

      if (isOpenMaintenanceStatus(log.status) && vehicle.status === VehicleStatus.active) {
        await updateVehicle(vehicle.id, {
          status: VehicleStatus.maintenance,
          actorUserId: req.user?.id,
        });
      }

      return sendSuccess(
        res,
        {
          maintenance_log: toPublicVehicleMaintenanceLog(log, {
            locale: getRequestLocale(req),
          }),
        },
        { status: 201 },
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.patch(
  "/:id/maintenance/:maintenanceId",
  requirePermission("vehicles.write"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const vehicle = await findVehicleById(req.params.id);
      if (!vehicle) {
        return sendError(res, "Vehicle not found.", 404);
      }

      const existingLog = await findVehicleMaintenanceLogById(req.params.maintenanceId);
      if (!existingLog || existingLog.vehicleId !== vehicle.id) {
        return sendError(res, "Maintenance log not found.", 404);
      }

      const workTypeId =
        req.body?.work_type_id !== undefined ||
        req.body?.work_type_slug !== undefined ||
        req.body?.type !== undefined
          ? await resolveMaintenanceWorkTypeId({
              workTypeId: req.body?.work_type_id,
              workTypeSlug: req.body?.work_type_slug,
              type: req.body?.type,
            })
          : undefined;
      const status = parseVehicleMaintenanceStatus(req.body?.status);
      const title = getOptionalString(req.body?.title);

      if (
        (req.body?.work_type_id !== undefined ||
          req.body?.work_type_slug !== undefined ||
          req.body?.type !== undefined) &&
        !workTypeId
      ) {
        return sendError(res, "A valid maintenance work type is required.", 400);
      }

      if (req.body?.status !== undefined && !status) {
        return sendError(res, "A valid maintenance status is required.", 400);
      }

      if (req.body?.title !== undefined && !title) {
        return sendError(res, "Maintenance title is required.", 400);
      }

      const log = await updateVehicleMaintenanceLog(existingLog.id, {
        workTypeId: workTypeId ?? undefined,
        status,
        title: title ?? undefined,
        description: getOptionalString(req.body?.description),
        vendor: getOptionalString(req.body?.vendor),
        costAmount: parseOptionalNumber(req.body?.cost_amount),
        odometerKm: parseOptionalNumber(req.body?.odometer_km),
        startedAt: parseOptionalDate(req.body?.started_at),
        completedAt: parseOptionalDate(req.body?.completed_at),
        nextDueAt: parseOptionalDate(req.body?.next_due_at),
        nextDueKm: parseOptionalNumber(req.body?.next_due_km),
      });

      let historyEventType:
        | typeof VehicleHistoryEventType.maintenance_updated
        | typeof VehicleHistoryEventType.maintenance_completed
        | typeof VehicleHistoryEventType.maintenance_cancelled =
        VehicleHistoryEventType.maintenance_updated;
      if (status === "completed") {
        historyEventType = VehicleHistoryEventType.maintenance_completed;
      } else if (status === "cancelled") {
        historyEventType = VehicleHistoryEventType.maintenance_cancelled;
      }

      await createVehicleHistoryEvent({
        vehicleId: vehicle.id,
        eventType: historyEventType,
        summary:
          historyEventType === VehicleHistoryEventType.maintenance_completed
            ? `Maintenance completed: ${log.title}`
            : historyEventType === VehicleHistoryEventType.maintenance_cancelled
              ? `Maintenance cancelled: ${log.title}`
              : `Maintenance updated: ${log.title}`,
        actorUserId: req.user?.id,
        metadata: {
          maintenance_id: log.id,
          work_type_id: log.workTypeId,
          work_type_slug: log.workType.slug,
          status: log.status,
        },
      });

      const openCount = await countOpenVehicleMaintenance(vehicle.id);
      if (openCount === 0 && vehicle.status === VehicleStatus.maintenance) {
        await updateVehicle(vehicle.id, {
          status: VehicleStatus.active,
          actorUserId: req.user?.id,
        });
      } else if (openCount > 0 && vehicle.status === VehicleStatus.active) {
        await updateVehicle(vehicle.id, {
          status: VehicleStatus.maintenance,
          actorUserId: req.user?.id,
        });
      }

      return sendSuccess(res, {
        maintenance_log: toPublicVehicleMaintenanceLog(log, {
          locale: getRequestLocale(req),
        }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/:id/fuel",
  requirePermission("vehicles.read"),
  async (req: Request, res: Response) => {
    try {
      const vehicle = await findVehicleById(req.params.id);
      if (!vehicle) {
        return sendError(res, "Vehicle not found.", 404);
      }

      const pagination = parsePaginationQuery(req.query);
      const result = await paginate(
        pagination,
        () => countVehicleFuelLogs(vehicle.id),
        (skip, take) => listVehicleFuelLogs(vehicle.id, { skip, take }),
      );
      const previousOdometerById = await buildVehicleFuelPreviousOdometerMap(vehicle.id);

      return sendPaginatedSuccess(
        res,
        toPublicVehicleFuelLogs(result.data, previousOdometerById),
        result.pagination,
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/:id/fuel",
  requirePermission("vehicles.write"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const vehicle = await findVehicleById(req.params.id);
      if (!vehicle) {
        return sendError(res, "Vehicle not found.", 404);
      }

      const odometerKm = parsePositiveInteger(req.body?.odometer_km);
      const quantityLiters = parsePositiveQuantity(req.body?.quantity_liters);
      const loggedAt = parseLoggedAt(req.body?.logged_at) ?? new Date();
      const fuelType = parseVehicleFuelType(req.body?.fuel_type);

      if (odometerKm === undefined) {
        return sendError(res, "A valid odometer reading (km) is required.", 400);
      }

      if (quantityLiters === undefined) {
        return sendError(res, "A valid fuel quantity (liters) is required.", 400);
      }

      if (req.body?.fuel_type !== undefined && !fuelType) {
        return sendError(res, "A valid fuel type is required.", 400);
      }

      const totalCost = parsePositiveQuantity(req.body?.total_cost);
      const stationName = getOptionalString(req.body?.station_name);

      if (totalCost === undefined) {
        return sendError(res, "A valid total cost is required.", 400);
      }

      if (!stationName) {
        return sendError(res, "A station name is required.", 400);
      }

      const log = await createVehicleFuelLog({
        vehicleId: vehicle.id,
        loggedAt,
        odometerKm,
        quantityLiters,
        totalCost,
        fuelType,
        stationName,
        receiptReference: getOptionalString(req.body?.receipt_reference),
        source: VehicleFuelLogSource.manual,
        notes: getOptionalString(req.body?.notes),
        createdById: req.user?.id,
      });

      await createVehicleHistoryEvent({
        vehicleId: vehicle.id,
        eventType: VehicleHistoryEventType.fuel_logged,
        summary: `Fuel refill logged: ${quantityLiters} L at ${odometerKm} km`,
        actorUserId: req.user?.id,
        metadata: {
          fuel_log_id: log.id,
          quantity_liters: quantityLiters,
          odometer_km: odometerKm,
        },
      });

      const previousOdometerById = await buildVehicleFuelPreviousOdometerMap(vehicle.id);

      return sendSuccess(
        res,
        {
          fuel_log: toPublicVehicleFuelLog(log, {
            previousOdometerKm: previousOdometerById.get(log.id) ?? null,
          }),
        },
        { status: 201 },
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.patch(
  "/:id/fuel/:fuelLogId",
  requirePermission("vehicles.write"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const vehicle = await findVehicleById(req.params.id);
      if (!vehicle) {
        return sendError(res, "Vehicle not found.", 404);
      }

      const existingLog = await findVehicleFuelLogById(req.params.fuelLogId);
      if (!existingLog || existingLog.vehicleId !== vehicle.id) {
        return sendError(res, "Fuel log not found.", 404);
      }

      const odometerKm =
        req.body?.odometer_km !== undefined
          ? parsePositiveInteger(req.body.odometer_km)
          : undefined;
      const quantityLiters =
        req.body?.quantity_liters !== undefined
          ? parsePositiveQuantity(req.body.quantity_liters)
          : undefined;
      const loggedAt =
        req.body?.logged_at !== undefined ? parseLoggedAt(req.body.logged_at) : undefined;
      const fuelType =
        req.body?.fuel_type !== undefined ? parseVehicleFuelType(req.body.fuel_type) : undefined;

      if (req.body?.odometer_km !== undefined && odometerKm === undefined) {
        return sendError(res, "A valid odometer reading (km) is required.", 400);
      }

      if (req.body?.quantity_liters !== undefined && quantityLiters === undefined) {
        return sendError(res, "A valid fuel quantity (liters) is required.", 400);
      }

      if (req.body?.logged_at !== undefined && !loggedAt) {
        return sendError(res, "A valid refill date is required.", 400);
      }

      if (req.body?.fuel_type !== undefined && !fuelType) {
        return sendError(res, "A valid fuel type is required.", 400);
      }

      if (req.body?.total_cost !== undefined) {
        const totalCost = parsePositiveQuantity(req.body.total_cost);
        if (totalCost === undefined) {
          return sendError(res, "A valid total cost is required.", 400);
        }
      }

      if (req.body?.station_name !== undefined) {
        const stationName = getOptionalString(req.body.station_name);
        if (!stationName) {
          return sendError(res, "A station name is required.", 400);
        }
      }

      const log = await updateVehicleFuelLog(existingLog.id, {
        loggedAt,
        odometerKm,
        quantityLiters,
        totalCost: parseOptionalNumber(req.body?.total_cost),
        fuelType,
        stationName: getOptionalString(req.body?.station_name),
        receiptReference: getOptionalString(req.body?.receipt_reference),
        notes: getOptionalString(req.body?.notes),
      });

      await createVehicleHistoryEvent({
        vehicleId: vehicle.id,
        eventType: VehicleHistoryEventType.fuel_updated,
        summary: `Fuel log updated: ${Number(log.quantityLiters)} L at ${log.odometerKm} km`,
        actorUserId: req.user?.id,
        metadata: {
          fuel_log_id: log.id,
          quantity_liters: Number(log.quantityLiters),
          odometer_km: log.odometerKm,
        },
      });

      const previousOdometerById = await buildVehicleFuelPreviousOdometerMap(vehicle.id);

      return sendSuccess(res, {
        fuel_log: toPublicVehicleFuelLog(log, {
          previousOdometerKm: previousOdometerById.get(log.id) ?? null,
        }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post("/", requirePermission("vehicles.write"), (req: AuthenticatedRequest, res: Response) => {
  vehiclePhotoUpload.any()(req, res, async (uploadError) => {
    if (uploadError) {
      if (uploadError instanceof multer.MulterError) {
        if (uploadError.code === "LIMIT_FILE_SIZE") {
          return sendError(res, "Vehicle image must be 5 MB or smaller.", 400);
        }

        return sendError(res, `${uploadError.message}: ${uploadError.field}`, 400);
      }

      return sendError(
        res,
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
        400,
      );
    }

    if (((req.files as Express.Multer.File[]) ?? []).length > 8) {
      return sendError(res, "You can upload a maximum of 8 vehicle images.", 400);
    }

    try {
      const locale = getRequestLocale(req);
      const plateNumber = getString(req.body?.plate_number);
      const chassisNumber = getString(req.body?.chassis_number);
      const vehicleTypeId = getString(req.body?.vehicle_type_id);
      const vehicleClassId = getString(req.body?.vehicle_class_id);
      const status = parseVehicleStatus(req.body?.status);
      const year = parseYear(req.body?.year);
      const assignedDriverUserId = parseAssignedDriverUserId(req.body?.assigned_driver_user_id);
      const uploadedImages = (req.files ?? [])
        .filter((file): file is Express.Multer.File => Boolean(file))
        .map((file) => buildVehiclePhotoUrl(file.filename));
      const existingImages = getStringArray(req.body?.vehicle_images_existing);

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
        images: uploadedImages,
        ...parseComplianceBody(req.body ?? {}),
        actorUserId: req.user?.id,
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
});

router.patch("/:id", requirePermission("vehicles.write", "compliance.write"), (req: AuthenticatedRequest, res: Response) => {
  vehiclePhotoUpload.any()(req, res, async (uploadError) => {
    if (uploadError) {
      if (uploadError instanceof multer.MulterError) {
        if (uploadError.code === "LIMIT_FILE_SIZE") {
          return sendError(res, "Vehicle image must be 5 MB or smaller.", 400);
        }

        return sendError(res, `${uploadError.message}: ${uploadError.field}`, 400);
      }

      return sendError(
        res,
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
        400,
      );
    }

    if (((req.files as Express.Multer.File[]) ?? []).length > 8) {
      return sendError(res, "You can upload a maximum of 8 vehicle images.", 400);
    }

    try {
      const locale = getRequestLocale(req);
      const existing = await findVehicleById(req.params.id);
      if (!existing) {
        return sendError(res, "Vehicle not found.", 404);
      }

      if (!(await assertCanPatchVehicle(req, res))) {
        return;
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

      const isTypeChanged = vehicleTypeId && vehicleTypeId !== existing.vehicleTypeId;
      const isClassChanged = vehicleClassId && vehicleClassId !== existing.vehicleClassId;

      if (isTypeChanged || isClassChanged) {
        const typeClassAllowed = await isVehicleTypeClassAllowed(
          resolvedVehicleTypeId,
          resolvedVehicleClassId,
        );
        if (!typeClassAllowed) {
          return sendError(res, "Selected vehicle class is not allowed for this vehicle type.", 400);
        }
      }

      const assignedDriverUserId = parseAssignedDriverUserId(req.body?.assigned_driver_user_id);
      const uploadedImages = (req.files ?? [])
        .filter((file): file is Express.Multer.File => Boolean(file))
        .map((file) => buildVehiclePhotoUrl(file.filename));
      const existingImages = getStringArray(req.body?.vehicle_images_existing);

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
        images: [...existingImages, ...uploadedImages],
        ...parseComplianceBody(req.body ?? {}),
        actorUserId: req.user?.id,
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
