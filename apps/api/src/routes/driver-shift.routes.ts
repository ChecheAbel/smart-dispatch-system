import { Router, type Request, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicAttendanceDriver } from "../mappers/driver-attendance.mapper";
import {
  toPublicShiftAssignment,
  toPublicShiftTemplate,
} from "../mappers/driver-shift.mapper";
import { findHiredDriverById } from "../models/driver-attendance.model";
import {
  countAssignmentsForShiftTemplate,
  countDriverShiftRoster,
  createShiftTemplate,
  deleteDriverShiftAssignment,
  deleteDriverShiftAssignmentByDriverAndDate,
  deleteShiftTemplate,
  ensureDefaultShiftTemplates,
  findDriverShiftAssignmentById,
  findShiftTemplateById,
  findShiftTemplateByIdOrSlug,
  getDriverShiftSummary,
  getDriverShiftWeek,
  listDriverShiftRoster,
  listDriverShiftTemplates,
  updateShiftTemplate,
  upsertDriverShiftAssignment,
} from "../models/driver-shift.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { getOptionalString, getString, parseBoolean, parseShiftClockTime, parseWorkDate } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

function todayWorkDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function parseShiftFilter(value: unknown) {
  const shift = getString(value);
  return shift || undefined;
}

router.get("/templates", requirePermission("drivers.read"), async (req: Request, res: Response) => {
  try {
    await ensureDefaultShiftTemplates();
    const includeInactive = parseBoolean(req.query.include_inactive) === true;
    const templates = await listDriverShiftTemplates(!includeInactive);
    return sendSuccess(res, { templates: templates.map(toPublicShiftTemplate) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/templates", requirePermission("drivers.write"), async (req: Request, res: Response) => {
  try {
    const name = getString(req.body?.name);
    const startTime = parseShiftClockTime(req.body?.start_time);
    const endTime = parseShiftClockTime(req.body?.end_time);
    const active = parseBoolean(req.body?.active);

    if (!name) {
      return sendError(res, "Period name is required.", 400);
    }

    if (!startTime || !endTime) {
      return sendError(res, "Start and end times must use HH:mm.", 400);
    }

    const template = await createShiftTemplate({
      name,
      startTime,
      endTime,
      active: active ?? true,
    });

    return sendSuccess(res, { template: toPublicShiftTemplate(template) }, { status: 201 });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/templates/:id", requirePermission("drivers.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findShiftTemplateById(req.params.id);
    if (!existing) {
      return sendError(res, "Shift period not found.", 404);
    }

    const name = getString(req.body?.name);
    const startTime = parseShiftClockTime(req.body?.start_time);
    const endTime = parseShiftClockTime(req.body?.end_time);
    const active = parseBoolean(req.body?.active);

    if (req.body?.name !== undefined && !name) {
      return sendError(res, "Period name is required.", 400);
    }

    if (req.body?.start_time !== undefined && !startTime) {
      return sendError(res, "Start time must use HH:mm.", 400);
    }

    if (req.body?.end_time !== undefined && !endTime) {
      return sendError(res, "End time must use HH:mm.", 400);
    }

    const template = await updateShiftTemplate(existing.id, {
      name: name || undefined,
      startTime,
      endTime,
      active,
    });

    return sendSuccess(res, { template: toPublicShiftTemplate(template) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/templates/:id", requirePermission("drivers.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findShiftTemplateById(req.params.id);
    if (!existing) {
      return sendError(res, "Shift period not found.", 404);
    }

    const assigned = await countAssignmentsForShiftTemplate(existing.id);
    if (assigned > 0) {
      return sendError(
        res,
        "This period is assigned to drivers. Clear those assignments or deactivate the period instead.",
        409,
      );
    }

    await deleteShiftTemplate(existing.id);
    return sendSuccess(res, { message: "Shift period deleted." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/summary", requirePermission("drivers.read"), async (req: Request, res: Response) => {
  try {
    const workDate = parseWorkDate(req.query.date) ?? todayWorkDate();
    const summary = await getDriverShiftSummary(workDate);
    return sendSuccess(res, {
      summary: {
        work_date: summary.workDate,
        total_drivers: summary.totalDrivers,
        unassigned: summary.unassigned,
        by_shift: summary.byShift.map((row) => ({
          template: toPublicShiftTemplate(row.template),
          count: row.count,
        })),
      },
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/week", requirePermission("drivers.read"), async (req: Request, res: Response) => {
  try {
    const workDate = parseWorkDate(req.query.date) ?? todayWorkDate();
    const week = await getDriverShiftWeek(workDate, getString(req.query.search) || undefined);
    return sendSuccess(res, {
      week: {
        start_date: week.startDate,
        end_date: week.endDate,
        templates: week.templates.map(toPublicShiftTemplate),
        days: week.days.map((day) => ({
          work_date: day.workDate,
          assigned: day.assigned,
          unassigned: day.unassigned,
          by_shift: day.byShift.map((row) => ({
            template_id: row.templateId,
            slug: row.slug,
            count: row.count,
          })),
        })),
        roster: week.roster.map((row) => ({
          driver: toPublicAttendanceDriver(row.driver),
          assignments: Object.fromEntries(
            Object.entries(row.assignments).map(([date, assignment]) => [
              date,
              toPublicShiftAssignment(assignment),
            ]),
          ),
        })),
      },
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/", requirePermission("drivers.read"), async (req: Request, res: Response) => {
  try {
    const workDate = parseWorkDate(req.query.date) ?? todayWorkDate();
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      workDate,
      search: getString(req.query.search) || undefined,
      shift: parseShiftFilter(req.query.shift),
    };

    const result = await paginate(
      pagination,
      () => countDriverShiftRoster(filter),
      (skip, take) => listDriverShiftRoster(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((row) => ({
        driver: toPublicAttendanceDriver(row.driver),
        assignment: row.assignment ? toPublicShiftAssignment(row.assignment) : null,
      })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put("/", requirePermission("drivers.write"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const driverUserId = getString(req.body?.driver_user_id);
    const workDate = parseWorkDate(req.body?.work_date) ?? todayWorkDate();
    const shiftTemplateValue = getOptionalString(req.body?.shift_template_id);

    if (!driverUserId) {
      return sendError(res, "Driver is required.", 400);
    }

    const driver = await findHiredDriverById(driverUserId);
    if (!driver) {
      return sendError(res, "Hired driver not found.", 404);
    }

    if (shiftTemplateValue === null) {
      await deleteDriverShiftAssignmentByDriverAndDate(driverUserId, workDate);
      return sendSuccess(res, {
        driver: toPublicAttendanceDriver(driver),
        assignment: null,
      });
    }

    if (!shiftTemplateValue) {
      return sendError(res, "A shift is required.", 400);
    }

    const template = await findShiftTemplateByIdOrSlug(shiftTemplateValue);
    if (!template || !template.active) {
      return sendError(res, "Shift not found.", 404);
    }

    const assignment = await upsertDriverShiftAssignment({
      driverUserId,
      workDate,
      shiftTemplateId: template.id,
      notes: getOptionalString(req.body?.notes),
      assignedByUserId: req.user?.id ?? null,
    });

    return sendSuccess(res, {
      driver: toPublicAttendanceDriver(driver),
      assignment: toPublicShiftAssignment(assignment),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("drivers.write"), async (req: Request, res: Response) => {
  try {
    const assignment = await findDriverShiftAssignmentById(req.params.id);
    if (!assignment) {
      return sendError(res, "Shift assignment not found.", 404);
    }

    await deleteDriverShiftAssignment(assignment.id);
    return sendSuccess(res, { message: "Shift assignment cleared." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerDriverShiftRoutes(app: import("express").Express) {
  app.use("/api/driver-shifts", router);
}
