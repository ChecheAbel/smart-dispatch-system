import { Router, type Request, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicMaintenanceWorkType } from "../mappers/maintenance-work-type.mapper";
import {
  countMaintenanceLogsByWorkTypeId,
  countMaintenanceWorkTypes,
  createMaintenanceWorkType,
  deleteMaintenanceWorkType,
  findMaintenanceWorkTypeById,
  hasDefaultLocaleTranslation,
  listActiveMaintenanceWorkTypes,
  listMaintenanceWorkTypes,
  slugFromMaintenanceWorkTypeTranslations,
  updateMaintenanceWorkType,
} from "../models/maintenance-work-type.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getRoleTranslations, getString, parseBoolean } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate);

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

function parseSortOrder(value: unknown) {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.trunc(value);
}

router.get(
  "/active",
  requirePermission("maintenance_work_types.read", "vehicles.read", "driver.maintenance"),
  async (req: Request, res: Response) => {
    try {
      const locale = getRequestLocale(req);
      const workTypes = await listActiveMaintenanceWorkTypes();

      return sendSuccess(res, {
        maintenance_work_types: workTypes.map((workType) =>
          toPublicMaintenanceWorkType(workType, { locale }),
        ),
      });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.use(authorize("admin"), auditMutations());

router.get("/", requirePermission("maintenance_work_types.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      isActive: parseBoolean(req.query.is_active),
    };

    const result = await paginate(
      pagination,
      () => countMaintenanceWorkTypes(filter),
      (skip, take) => listMaintenanceWorkTypes(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((workType) => toPublicMaintenanceWorkType(workType, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("maintenance_work_types.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const workType = await findMaintenanceWorkTypeById(req.params.id);
    if (!workType) {
      return sendError(res, "Maintenance work type not found.", 404);
    }

    return sendSuccess(res, {
      maintenance_work_type: toPublicMaintenanceWorkType(workType, {
        locale,
        includeAllTranslations: true,
      }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("maintenance_work_types.write"), async (req: Request, res: Response) => {
  try {
    const translations = getRoleTranslations(req.body?.translations);
    const isActive = parseBoolean(req.body?.is_active);
    const sortOrder = parseSortOrder(req.body?.sort_order);

    if (!translations.length) {
      return sendError(res, "At least one translation is required.", 400);
    }

    if (!hasDefaultLocaleTranslation(translations)) {
      return sendError(res, "An English (en) translation is required.", 400);
    }

    if (!slugFromMaintenanceWorkTypeTranslations(translations)) {
      return sendError(res, "English name is required to generate a work type identifier.", 400);
    }

    const workType = await createMaintenanceWorkType({
      translations,
      isActive: isActive ?? true,
      sortOrder: sortOrder ?? 0,
    });

    return sendSuccess(
      res,
      {
        maintenance_work_type: toPublicMaintenanceWorkType(workType, {
          includeAllTranslations: true,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "MAINTENANCE_WORK_TYPE_SLUG_REQUIRED") {
      return sendError(res, "English name is required to generate a work type identifier.", 400);
    }

    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("maintenance_work_types.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findMaintenanceWorkTypeById(req.params.id);
    if (!existing) {
      return sendError(res, "Maintenance work type not found.", 404);
    }

    const translations = getRoleTranslations(req.body?.translations);
    const isActive = parseBoolean(req.body?.is_active);
    const sortOrder = parseSortOrder(req.body?.sort_order);

    const workType = await updateMaintenanceWorkType(req.params.id, {
      translations: translations.length ? translations : undefined,
      isActive,
      sortOrder,
    });

    return sendSuccess(res, {
      maintenance_work_type: toPublicMaintenanceWorkType(workType, { includeAllTranslations: true }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "MAINTENANCE_WORK_TYPE_SLUG_REQUIRED") {
      return sendError(res, "English name is required to generate a work type identifier.", 400);
    }

    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("maintenance_work_types.delete"), async (req: Request, res: Response) => {
  try {
    const workType = await findMaintenanceWorkTypeById(req.params.id);
    if (!workType) {
      return sendError(res, "Maintenance work type not found.", 404);
    }

    const linkedLogs = await countMaintenanceLogsByWorkTypeId(req.params.id);
    if (linkedLogs > 0) {
      return sendError(res, "Cannot delete a work type that is used by maintenance logs.", 409);
    }

    await deleteMaintenanceWorkType(req.params.id);
    return sendSuccess(res, { message: "Maintenance work type deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerMaintenanceWorkTypeRoutes(app: import("express").Express) {
  app.use("/api/maintenance-work-types", router);
}
