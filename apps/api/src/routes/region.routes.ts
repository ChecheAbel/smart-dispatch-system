import { Router, type Request, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicRegion } from "../mappers/region.mapper";
import {
  countLocationsByRegionId,
  countRegions,
  createRegion,
  deleteRegion,
  findRegionById,
  hasDefaultLocaleTranslation,
  listActiveRegions,
  listRegions,
  slugFromRegionTranslations,
  updateRegion,
} from "../models/region.model";
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

router.get("/", requirePermission("regions.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      isActive: parseBoolean(req.query.is_active),
    };

    const result = await paginate(
      pagination,
      () => countRegions(filter),
      (skip, take) => listRegions(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((region) => toPublicRegion(region, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/active", requirePermission("regions.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const regions = await listActiveRegions();

    return sendSuccess(res, {
      regions: regions.map((region) => toPublicRegion(region, { locale })),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("regions.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const region = await findRegionById(req.params.id);
    if (!region) {
      return sendError(res, "Region not found.", 404);
    }

    return sendSuccess(res, {
      region: toPublicRegion(region, { locale, includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("regions.write"), async (req: Request, res: Response) => {
  try {
    const translations = getRoleTranslations(req.body?.translations);
    const isActive = parseBoolean(req.body?.is_active);

    if (!translations.length) {
      return sendError(res, "At least one translation is required.", 400);
    }

    if (!hasDefaultLocaleTranslation(translations)) {
      return sendError(res, "An English (en) translation is required.", 400);
    }

    if (!slugFromRegionTranslations(translations)) {
      return sendError(res, "English name is required to generate a region identifier.", 400);
    }

    const region = await createRegion({
      translations,
      isActive: isActive ?? true,
    });

    return sendSuccess(
      res,
      { region: toPublicRegion(region, { includeAllTranslations: true }) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "REGION_SLUG_REQUIRED") {
      return sendError(res, "English name is required to generate a region identifier.", 400);
    }

    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("regions.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findRegionById(req.params.id);
    if (!existing) {
      return sendError(res, "Region not found.", 404);
    }

    const translations = getRoleTranslations(req.body?.translations);
    const isActive = parseBoolean(req.body?.is_active);

    const region = await updateRegion(req.params.id, {
      translations: translations.length ? translations : undefined,
      isActive,
    });

    return sendSuccess(res, {
      region: toPublicRegion(region, { includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("regions.delete"), async (req: Request, res: Response) => {
  try {
    const region = await findRegionById(req.params.id);
    if (!region) {
      return sendError(res, "Region not found.", 404);
    }

    const linkedLocations = await countLocationsByRegionId(req.params.id);
    if (linkedLocations > 0) {
      return sendError(res, "Cannot delete a region that has locations.", 409);
    }

    await deleteRegion(req.params.id);
    return sendSuccess(res, { message: "Region deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerRegionRoutes(app: import("express").Express) {
  app.use("/api/regions", router);
}
