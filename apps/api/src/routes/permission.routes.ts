import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicPermission } from "../mappers/permission.mapper";
import {
  countPermissions,
  findPermissionById,
  findPermissionBySlug,
  listPermissions,
} from "../models/permission.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/", requirePermission("menus.read"), async (req: Request, res: Response) => {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      module: getString(req.query.module) || undefined,
    };

    const result = await paginate(
      pagination,
      () => countPermissions(filter),
      (skip, take) => listPermissions(filter, { skip, take, includeEndpoints: true }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((permission) => toPublicPermission(permission)),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/slug/:slug", requirePermission("menus.read"), async (req: Request, res: Response) => {
  try {
    const permission = await findPermissionBySlug(req.params.slug);
    if (!permission) {
      return sendError(res, "Permission not found.", 404);
    }

    return sendSuccess(res, { permission: toPublicPermission(permission) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("menus.read"), async (req: Request, res: Response) => {
  try {
    const permission = await findPermissionById(req.params.id);
    if (!permission) {
      return sendError(res, "Permission not found.", 404);
    }

    return sendSuccess(res, { permission: toPublicPermission(permission) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerPermissionRoutes(app: import("express").Express) {
  app.use("/api/permissions", router);
}
