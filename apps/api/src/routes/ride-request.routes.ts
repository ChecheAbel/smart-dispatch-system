import { Router, type Response } from "express";
import type { RideRequestStatus } from "@smart-dispatch/types";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { requirePermission } from "../middleware/require-permission";
import { toPublicRideRequest } from "../mappers/ride-request.mapper";
import { toPublicRegion } from "../mappers/region.mapper";
import { toRideRequestLocationOption } from "../mappers/location.mapper";
import { toPublicVehicleClass } from "../mappers/vehicle-class.mapper";
import { toPublicVehicleType } from "../mappers/vehicle-type.mapper";
import {
  cancelRideRequestForUser,
  countRideRequestsForUser,
  countRideRequestsForDriver,
  createRideRequest,
  findRideRequestForUser,
  listRideRequestsForDriver,
  listRideRequestsForUser,
  updateRideRequestForUser,
} from "../models/ride-request.model";
import { listVehicles, updateVehicle } from "../models/vehicle.model";
import { toPublicVehicle } from "../mappers/vehicle.mapper";
import { toPublicVehicleMaintenanceLog, toPublicVehicleFuelLog, toPublicVehicleFuelLogs } from "../mappers/vehicle-ops.mapper";
import { toPublicMaintenanceWorkType } from "../mappers/maintenance-work-type.mapper";
import {
  buildVehicleFuelPreviousOdometerMap,
  countOpenVehicleMaintenance,
  countVehicleFuelLogs,
  countVehicleMaintenanceLogs,
  createVehicleFuelLog,
  createVehicleHistoryEvent,
  createVehicleMaintenanceLog,
  findVehicleFuelLogById,
  findVehicleMaintenanceLogById,
  isOpenMaintenanceStatus,
  listVehicleFuelLogs,
  listVehicleMaintenanceLogs,
  parseVehicleFuelType,
  parseVehicleMaintenanceStatus,
  updateVehicleFuelLog,
  updateVehicleMaintenanceLog,
} from "../models/vehicle-ops.model";
import {
  findMaintenanceWorkTypeById,
  resolveMaintenanceWorkTypeId,
} from "../models/maintenance-work-type.model";
import { VehicleFuelLogSource, VehicleHistoryEventType, VehicleStatus } from "../generated/prisma";
import { listActiveRegions } from "../models/region.model";
import { listActiveBookingLocations } from "../models/location.model";
import { listActiveVehicleTypesWithAllowedClasses } from "../models/vehicle-type-class.model";
import { recordAuditLog } from "../services/audit-log.service";
import { queueRideRequestNotifications } from "../services/notification-dispatch.service";
import { parseRideRequestPayload } from "../services/ride-request-payload.service";
import { validateRideRequestReferences } from "../services/ride-request-reference.service";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

const RIDE_REQUEST_STATUSES = new Set<RideRequestStatus>([
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
]);

router.use(authenticate);

function getRequestLocale(req: AuthenticatedRequest) {
  return parseLocale(req.query, req.headers["accept-language"]);
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

async function findAssignedVehicleForDriver(userId: string) {
  const vehicles = await listVehicles({ assignedDriverUserId: userId }, { skip: 0, take: 1 });
  return vehicles[0] ?? null;
}

function parseStatusFilter(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const status = value.trim() as RideRequestStatus;
  return RIDE_REQUEST_STATUSES.has(status) ? status : undefined;
}

function mapRideRequestList(
  rideRequests: Awaited<ReturnType<typeof listRideRequestsForUser>>,
  locale?: string,
) {
  return rideRequests.map((rideRequest) => toPublicRideRequest(rideRequest, { locale }));
}

function mapRideRequestListForDriver(
  rideRequests: Awaited<ReturnType<typeof listRideRequestsForDriver>>,
  locale?: string,
) {
  return rideRequests.map((rideRequest) => toPublicRideRequest(rideRequest, { locale }));
}

router.get(
  "/form-options",
  requirePermission("customer_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const regionId = getOptionalString(req.query.region_id);
      const [vehicleTypes, regions, pickupLocations, dropoffLocations] = await Promise.all([
        listActiveVehicleTypesWithAllowedClasses(),
        listActiveRegions(),
        listActiveBookingLocations({ regionId: regionId ?? undefined, canPickup: true }),
        listActiveBookingLocations({ regionId: regionId ?? undefined, canDropoff: true }),
      ]);

      return sendSuccess(res, {
        vehicle_types: vehicleTypes.map((vehicleType) => ({
          ...toPublicVehicleType(vehicleType, { locale }),
          allowed_classes: vehicleType.vehicleClassLinks
            .map((link) => toPublicVehicleClass(link.vehicleClass, { locale }))
            .sort((left, right) => left.name.localeCompare(right.name)),
        })),
        regions: regions.map((region) => toPublicRegion(region, { locale })),
        pickup_locations: pickupLocations.map((location) =>
          toRideRequestLocationOption(location, { locale }),
        ),
        dropoff_locations: dropoffLocations.map((location) =>
          toRideRequestLocationOption(location, { locale }),
        ),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/",
  requirePermission("customer_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const pagination = parsePaginationQuery(req.query);
      const status = parseStatusFilter(req.query.status);
      const search = getOptionalString(req.query.search) ?? undefined;
      const filters = { requesterUserId: userId, status, search };

      const result = await paginate(
        pagination,
        () => countRideRequestsForUser(filters),
        (skip, take) => listRideRequestsForUser(filters, skip, take),
      );

      return sendPaginatedSuccess(res, mapRideRequestList(result.data, locale), result.pagination);
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/driver/vehicle",
  requirePermission("driver.vehicle"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const vehicles = await listVehicles(
        { assignedDriverUserId: userId },
        { skip: 0, take: 1 },
      );

      if (!vehicles.length) {
        return sendSuccess(res, { vehicle: null });
      }

      return sendSuccess(res, {
        vehicle: toPublicVehicle(vehicles[0], { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/driver/upcoming",
  requirePermission("driver.upcoming"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const pagination = parsePaginationQuery(req.query);
      const filters = { driverUserId: userId, upcoming: true as const };

      const result = await paginate(
        pagination,
        () => countRideRequestsForDriver(filters),
        (skip, take) => listRideRequestsForDriver(filters, skip, take),
      );

      return sendPaginatedSuccess(
        res,
        mapRideRequestListForDriver(result.data, locale),
        result.pagination,
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/driver/history",
  requirePermission("driver.history"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const pagination = parsePaginationQuery(req.query);
      const status = parseStatusFilter(req.query.status);

      if (status && status !== "completed" && status !== "cancelled") {
        return sendError(
          res,
          "History trips can only be filtered by completed or cancelled status.",
          400,
        );
      }

      const filters = { driverUserId: userId, history: true as const, status };

      const result = await paginate(
        pagination,
        () => countRideRequestsForDriver(filters),
        (skip, take) => listRideRequestsForDriver(filters, skip, take),
      );

      return sendPaginatedSuccess(
        res,
        mapRideRequestListForDriver(result.data, locale),
        result.pagination,
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/driver/maintenance",
  requirePermission("driver.maintenance"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const vehicle = await findAssignedVehicleForDriver(userId);
      if (!vehicle) {
        return sendError(res, "No vehicle is assigned to this driver.", 404);
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
  "/driver/maintenance",
  requirePermission("driver.maintenance"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const vehicle = await findAssignedVehicleForDriver(userId);
      if (!vehicle) {
        return sendError(res, "No vehicle is assigned to this driver.", 404);
      }

      const locale = getRequestLocale(req);
      const workTypeId = await resolveMaintenanceWorkTypeId({
        workTypeId: req.body?.work_type_id,
        workTypeSlug: req.body?.work_type_slug,
        type: req.body?.type,
      });
      const status = parseVehicleMaintenanceStatus(req.body?.status);
      let title = getOptionalString(req.body?.title);

      if (!workTypeId) {
        return sendError(res, "A valid maintenance work type is required.", 400);
      }

      if (!title) {
        const workType = await findMaintenanceWorkTypeById(workTypeId);
        title = workType ? toPublicMaintenanceWorkType(workType, { locale }).name : null;
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
        createdById: userId,
      });

      await createVehicleHistoryEvent({
        vehicleId: vehicle.id,
        eventType: VehicleHistoryEventType.maintenance_opened,
        summary: `Maintenance opened: ${log.title}`,
        actorUserId: userId,
        metadata: {
          maintenance_id: log.id,
          work_type_id: log.workTypeId,
          work_type_slug: log.workType.slug,
          status: log.status,
          source: "driver",
        },
      });

      if (isOpenMaintenanceStatus(log.status) && vehicle.status === VehicleStatus.active) {
        await updateVehicle(vehicle.id, {
          status: VehicleStatus.maintenance,
          actorUserId: userId,
        });
      }

      return sendSuccess(
        res,
        {
          maintenance_log: toPublicVehicleMaintenanceLog(log, { locale }),
        },
        { status: 201 },
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.patch(
  "/driver/maintenance/:maintenanceId",
  requirePermission("driver.maintenance"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const vehicle = await findAssignedVehicleForDriver(userId);
      if (!vehicle) {
        return sendError(res, "No vehicle is assigned to this driver.", 404);
      }

      const existingLog = await findVehicleMaintenanceLogById(req.params.maintenanceId);
      if (!existingLog || existingLog.vehicleId !== vehicle.id) {
        return sendError(res, "Maintenance log not found.", 404);
      }

      const locale = getRequestLocale(req);
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
        actorUserId: userId,
        metadata: {
          maintenance_id: log.id,
          work_type_id: log.workTypeId,
          work_type_slug: log.workType.slug,
          status: log.status,
          source: "driver",
        },
      });

      const openCount = await countOpenVehicleMaintenance(vehicle.id);
      if (openCount === 0 && vehicle.status === VehicleStatus.maintenance) {
        await updateVehicle(vehicle.id, {
          status: VehicleStatus.active,
          actorUserId: userId,
        });
      } else if (openCount > 0 && vehicle.status === VehicleStatus.active) {
        await updateVehicle(vehicle.id, {
          status: VehicleStatus.maintenance,
          actorUserId: userId,
        });
      }

      return sendSuccess(res, {
        maintenance_log: toPublicVehicleMaintenanceLog(log, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/driver/fuel",
  requirePermission("driver.fuel"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const vehicle = await findAssignedVehicleForDriver(userId);
      if (!vehicle) {
        return sendError(res, "No vehicle is assigned to this driver.", 404);
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
  "/driver/fuel",
  requirePermission("driver.fuel"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const vehicle = await findAssignedVehicleForDriver(userId);
      if (!vehicle) {
        return sendError(res, "No vehicle is assigned to this driver.", 404);
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
        source: VehicleFuelLogSource.driver_app,
        notes: getOptionalString(req.body?.notes),
        createdById: userId,
      });

      await createVehicleHistoryEvent({
        vehicleId: vehicle.id,
        eventType: VehicleHistoryEventType.fuel_logged,
        summary: `Fuel refill logged: ${quantityLiters} L at ${odometerKm} km`,
        actorUserId: userId,
        metadata: {
          fuel_log_id: log.id,
          quantity_liters: quantityLiters,
          odometer_km: odometerKm,
          source: "driver",
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
  "/driver/fuel/:fuelLogId",
  requirePermission("driver.fuel"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const vehicle = await findAssignedVehicleForDriver(userId);
      if (!vehicle) {
        return sendError(res, "No vehicle is assigned to this driver.", 404);
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
        actorUserId: userId,
        metadata: {
          fuel_log_id: log.id,
          quantity_liters: Number(log.quantityLiters),
          odometer_km: log.odometerKm,
          source: "driver",
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

router.get(
  "/:id",
  requirePermission("customer_requests.read"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      const rideRequestId = req.params.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const rideRequest = await findRideRequestForUser(rideRequestId, userId);
      if (!rideRequest) {
        return sendError(res, "Ride request not found.", 404);
      }

      return sendSuccess(res, {
        ride_request: toPublicRideRequest(rideRequest, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/",
  requirePermission("customer_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const parsed = parseRideRequestPayload(req.body);
      if (!parsed.ok) {
        return sendError(res, parsed.error, 400);
      }

      const referenceError = await validateRideRequestReferences(parsed.data);
      if (referenceError) {
        return sendError(res, referenceError, 400);
      }

      const rideRequest = await createRideRequest({
        requesterUserId: userId,
        vehicleTypeId: parsed.data.vehicleTypeId,
        vehicleClassId: parsed.data.vehicleClassId,
        regionId: parsed.data.regionId,
        pickupLocationId: parsed.data.pickupLocationId,
        dropoffLocationId: parsed.data.dropoffLocationId,
        pickupAddress: parsed.data.pickupAddress.trim(),
        pickupLatitude: parsed.data.pickupLatitude,
        pickupLongitude: parsed.data.pickupLongitude,
        dropoffAddress: parsed.data.dropoffAddress.trim(),
        dropoffLatitude: parsed.data.dropoffLatitude,
        dropoffLongitude: parsed.data.dropoffLongitude,
        scheduledAt: parsed.data.scheduledAt,
        passengerCount: parsed.data.passengerCount,
        notes: parsed.data.notes,
      });

      await recordAuditLog({
        actorUserId: userId,
        action: "create",
        module: "customer_requests",
        entityType: "ride_request",
        entityId: rideRequest.id,
        entityLabel: `${rideRequest.pickupAddress} → ${rideRequest.dropoffAddress}`,
        summary: "Customer ride request submitted",
        req,
      });

      queueRideRequestNotifications("created", rideRequest.id);

      return sendSuccess(
        res,
        { ride_request: toPublicRideRequest(rideRequest, { locale }) },
        { status: 201, message: "Ride request submitted successfully." },
      );
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.patch(
  "/:id",
  requirePermission("customer_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      const rideRequestId = req.params.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const parsed = parseRideRequestPayload(req.body);
      if (!parsed.ok) {
        return sendError(res, parsed.error, 400);
      }

      const referenceError = await validateRideRequestReferences(parsed.data);
      if (referenceError) {
        return sendError(res, referenceError, 400);
      }

      const result = await updateRideRequestForUser(rideRequestId, userId, {
        vehicleTypeId: parsed.data.vehicleTypeId,
        vehicleClassId: parsed.data.vehicleClassId,
        regionId: parsed.data.regionId,
        pickupLocationId: parsed.data.pickupLocationId,
        dropoffLocationId: parsed.data.dropoffLocationId,
        pickupAddress: parsed.data.pickupAddress.trim(),
        pickupLatitude: parsed.data.pickupLatitude,
        pickupLongitude: parsed.data.pickupLongitude,
        dropoffAddress: parsed.data.dropoffAddress.trim(),
        dropoffLatitude: parsed.data.dropoffLatitude,
        dropoffLongitude: parsed.data.dropoffLongitude,
        scheduledAt: parsed.data.scheduledAt,
        passengerCount: parsed.data.passengerCount,
        notes: parsed.data.notes,
      });

      if (!result) {
        return sendError(res, "Ride request not found.", 404);
      }

      if ("error" in result) {
        return sendError(res, result.error, 409);
      }

      await recordAuditLog({
        actorUserId: userId,
        action: "update",
        module: "customer_requests",
        entityType: "ride_request",
        entityId: result.id,
        entityLabel: `${result.pickupAddress} → ${result.dropoffAddress}`,
        summary: "Customer ride request updated",
        req,
      });

      return sendSuccess(res, {
        ride_request: toPublicRideRequest(result, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/:id/cancel",
  requirePermission("customer_requests.write"),
  auditMutations(),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const userId = req.user?.id;
      const rideRequestId = req.params.id;

      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const result = await cancelRideRequestForUser(rideRequestId, userId);

      if (!result) {
        return sendError(res, "Ride request not found.", 404);
      }

      if ("error" in result) {
        return sendError(res, result.error, 409);
      }

      await recordAuditLog({
        actorUserId: userId,
        action: "update",
        module: "customer_requests",
        entityType: "ride_request",
        entityId: result.id,
        entityLabel: `${result.pickupAddress} → ${result.dropoffAddress}`,
        summary: "Customer ride request cancelled",
        req,
      });

      queueRideRequestNotifications("cancelled", result.id);

      return sendSuccess(res, {
        ride_request: toPublicRideRequest(result, { locale }),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

export function registerRideRequestRoutes(app: import("express").Express) {
  app.use("/api/ride-requests", router);
}
