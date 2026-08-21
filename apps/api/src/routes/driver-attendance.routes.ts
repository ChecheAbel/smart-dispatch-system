import { Router, type Request, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import {
  toPublicAttendanceDriver,
  toPublicDriverAttendance,
} from "../mappers/driver-attendance.mapper";
import {
  countDriverAttendanceRoster,
  deleteDriverAttendance,
  findDriverAttendanceByDriverAndDate,
  findDriverAttendanceById,
  findHiredDriverById,
  getDriverAttendanceSummary,
  listDriverAttendanceRoster,
  upsertDriverAttendance,
} from "../models/driver-attendance.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import {
  combineWorkDateAndTime,
  getOptionalString,
  getString,
  parseDriverAttendanceStatus,
  parseWorkDate,
} from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

function todayWorkDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function parseRosterStatus(value: unknown) {
  if (value === "unmarked") return "unmarked" as const;
  return parseDriverAttendanceStatus(value);
}

router.get("/", requirePermission("drivers.read"), async (req: Request, res: Response) => {
  try {
    const workDate = parseWorkDate(req.query.date) ?? todayWorkDate();
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      workDate,
      search: getString(req.query.search) || undefined,
      status: parseRosterStatus(req.query.status),
    };

    const result = await paginate(
      pagination,
      () => countDriverAttendanceRoster(filter),
      (skip, take) => listDriverAttendanceRoster(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((row) => ({
        driver: toPublicAttendanceDriver(row.driver),
        attendance: row.attendance ? toPublicDriverAttendance(row.attendance) : null,
      })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/summary", requirePermission("drivers.read"), async (req: Request, res: Response) => {
  try {
    const workDate = parseWorkDate(req.query.date) ?? todayWorkDate();
    const summary = await getDriverAttendanceSummary(workDate);
    return sendSuccess(res, { summary });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put("/", requirePermission("drivers.write"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const driverUserId = getString(req.body?.driver_user_id);
    const workDate = parseWorkDate(req.body?.work_date) ?? todayWorkDate();
    const status = parseDriverAttendanceStatus(req.body?.status);

    if (!driverUserId) {
      return sendError(res, "Driver is required.", 400);
    }

    if (!status) {
      return sendError(res, "A valid attendance status is required.", 400);
    }

    const driver = await findHiredDriverById(driverUserId);
    if (!driver) {
      return sendError(res, "Hired driver not found.", 404);
    }

    const checkInAt = combineWorkDateAndTime(
      workDate,
      getOptionalString(req.body?.check_in_at) === null
        ? null
        : getString(req.body?.check_in_at) || undefined,
    );
    const checkOutAt = combineWorkDateAndTime(
      workDate,
      getOptionalString(req.body?.check_out_at) === null
        ? null
        : getString(req.body?.check_out_at) || undefined,
    );

    if (checkInAt && checkOutAt && checkOutAt.getTime() < checkInAt.getTime()) {
      return sendError(res, "Check-out time must be after check-in time.", 400);
    }

    const attendance = await upsertDriverAttendance({
      driverUserId,
      workDate,
      status,
      checkInAt,
      checkOutAt,
      notes: getOptionalString(req.body?.notes),
      recordedByUserId: req.user?.id ?? null,
    });

    return sendSuccess(res, {
      driver: toPublicAttendanceDriver(driver),
      attendance: toPublicDriverAttendance(attendance),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/check-in", requirePermission("drivers.write"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const driverUserId = getString(req.body?.driver_user_id);
    const workDate = parseWorkDate(req.body?.work_date) ?? todayWorkDate();

    if (!driverUserId) {
      return sendError(res, "Driver is required.", 400);
    }

    const driver = await findHiredDriverById(driverUserId);
    if (!driver) {
      return sendError(res, "Hired driver not found.", 404);
    }

    const existing = await findDriverAttendanceByDriverAndDate(driverUserId, workDate);
    if (existing && (existing.status === "on_leave" || existing.status === "off_duty")) {
      return sendError(res, "This driver is marked off duty or on leave for that date.", 400);
    }

    const attendance = await upsertDriverAttendance({
      driverUserId,
      workDate,
      status: existing?.status === "late" ? "late" : "present",
      checkInAt: new Date(),
      checkOutAt: null,
      notes: existing?.notes ?? null,
      recordedByUserId: req.user?.id ?? null,
    });

    return sendSuccess(res, {
      driver: toPublicAttendanceDriver(driver),
      attendance: toPublicDriverAttendance(attendance),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/check-out", requirePermission("drivers.write"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const driverUserId = getString(req.body?.driver_user_id);
    const workDate = parseWorkDate(req.body?.work_date) ?? todayWorkDate();

    if (!driverUserId) {
      return sendError(res, "Driver is required.", 400);
    }

    const driver = await findHiredDriverById(driverUserId);
    if (!driver) {
      return sendError(res, "Hired driver not found.", 404);
    }

    const existing = await findDriverAttendanceByDriverAndDate(driverUserId, workDate);
    if (!existing || !existing.checkInAt) {
      return sendError(res, "Check the driver in before checking out.", 400);
    }

    if (existing.status === "absent" || existing.status === "on_leave" || existing.status === "off_duty") {
      return sendError(res, "This driver is not on duty for that date.", 400);
    }

    const attendance = await upsertDriverAttendance({
      driverUserId,
      workDate,
      status: existing.status,
      checkInAt: existing.checkInAt,
      checkOutAt: new Date(),
      notes: existing.notes,
      recordedByUserId: req.user?.id ?? null,
    });

    return sendSuccess(res, {
      driver: toPublicAttendanceDriver(driver),
      attendance: toPublicDriverAttendance(attendance),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("drivers.write"), async (req: Request, res: Response) => {
  try {
    const attendance = await findDriverAttendanceById(req.params.id);
    if (!attendance) {
      return sendError(res, "Attendance record not found.", 404);
    }

    await deleteDriverAttendance(attendance.id);
    return sendSuccess(res, { message: "Attendance record cleared." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerDriverAttendanceRoutes(app: import("express").Express) {
  app.use("/api/driver-attendance", router);
}
