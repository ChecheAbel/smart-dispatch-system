import { Router, type Request, type Response } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicLocation, toPublicLocationDetail } from "../mappers/location.mapper";
import {
  countLocations,
  createLocation,
  deleteLocation,
  findLocationById,
  hasDefaultLocaleTranslation,
  listLocations,
  parseLatitude,
  parseLongitude,
  updateLocation,
} from "../models/location.model";
import { findRegionById } from "../models/region.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import {
  getOptionalString,
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

router.get("/", requirePermission("locations.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      regionId: getString(req.query.region_id) || undefined,
      isActive: parseBoolean(req.query.is_active),
    };

    const result = await paginate(
      pagination,
      () => countLocations(filter),
      (skip, take) => listLocations(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((location) => toPublicLocation(location, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("locations.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const location = await findLocationById(req.params.id);
    if (!location) {
      return sendError(res, "Location not found.", 404);
    }

    return sendSuccess(res, {
      location: toPublicLocationDetail(location, { locale, includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("locations.write"), async (req: Request, res: Response) => {
  try {
    const regionId = getString(req.body?.region_id);
    const translations = getRoleTranslations(req.body?.translations);
    const latitude = parseLatitude(req.body?.latitude);
    const longitude = parseLongitude(req.body?.longitude);
    const address = getOptionalString(req.body?.address);
    const isActive = parseBoolean(req.body?.is_active);

    if (!regionId) {
      return sendError(res, "Region is required.", 400);
    }

    if (!translations.length) {
      return sendError(res, "At least one translation is required.", 400);
    }

    if (!hasDefaultLocaleTranslation(translations)) {
      return sendError(res, "An English (en) translation is required.", 400);
    }

    if (latitude === undefined) {
      return sendError(res, "Valid latitude is required (-90 to 90).", 400);
    }

    if (longitude === undefined) {
      return sendError(res, "Valid longitude is required (-180 to 180).", 400);
    }

    const region = await findRegionById(regionId);
    if (!region) {
      return sendError(res, "Region not found.", 404);
    }

    const location = await createLocation({
      regionId,
      translations,
      latitude,
      longitude,
      address: address ?? null,
      isActive: isActive ?? true,
    });

    return sendSuccess(
      res,
      { location: toPublicLocationDetail(location, { includeAllTranslations: true }) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("locations.write"), async (req: Request, res: Response) => {
  try {
    const existing = await findLocationById(req.params.id);
    if (!existing) {
      return sendError(res, "Location not found.", 404);
    }

    const regionId = getOptionalString(req.body?.region_id);
    const translations = getRoleTranslations(req.body?.translations);
    const latitude = parseLatitude(req.body?.latitude);
    const longitude = parseLongitude(req.body?.longitude);
    const address = req.body?.address === null ? null : getOptionalString(req.body?.address);
    const isActive = parseBoolean(req.body?.is_active);

    if (req.body?.latitude !== undefined && latitude === undefined) {
      return sendError(res, "Valid latitude is required (-90 to 90).", 400);
    }

    if (req.body?.longitude !== undefined && longitude === undefined) {
      return sendError(res, "Valid longitude is required (-180 to 180).", 400);
    }

    if (regionId) {
      const region = await findRegionById(regionId);
      if (!region) {
        return sendError(res, "Region not found.", 404);
      }
    }

    const location = await updateLocation(req.params.id, {
      regionId: regionId ?? undefined,
      translations: translations.length ? translations : undefined,
      latitude,
      longitude,
      address,
      isActive,
    });

    return sendSuccess(res, {
      location: toPublicLocationDetail(location, { includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("locations.delete"), async (req: Request, res: Response) => {
  try {
    const location = await findLocationById(req.params.id);
    if (!location) {
      return sendError(res, "Location not found.", 404);
    }

    await deleteLocation(req.params.id);
    return sendSuccess(res, { message: "Location deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerLocationRoutes(app: import("express").Express) {
  app.use("/api/locations", router);
}
