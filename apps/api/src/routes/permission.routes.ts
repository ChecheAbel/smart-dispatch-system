import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicPermission } from "../mappers/permission.mapper";
import {
  countPermissions,
  createPermission,
  deletePermission,
  findPermissionById,
  findPermissionBySlug,
  listPermissions,
  updatePermission,
} from "../models/permission.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { getOptionalString, getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/", requirePermission("permissions.read"), async (req: Request, res: Response) => {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      module: getString(req.query.module) || undefined,
    };

    const result = await paginate(
      pagination,
      () => countPermissions(filter),
      (skip, take) => listPermissions(filter, { skip, take }),
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

router.get("/slug/:slug", requirePermission("permissions.read"), async (req: Request, res: Response) => {
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

router.get("/:id", requirePermission("permissions.read"), async (req: Request, res: Response) => {
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

router.post("/", requirePermission("permissions.write"), async (req: Request, res: Response) => {
  try {
    const slug = getString(req.body?.slug);
    const module = getString(req.body?.module);
    const action = getString(req.body?.action);

    if (!slug || !module || !action) {
      return sendError(res, "Slug, module, and action are required.", 400);
    }

    const permission = await createPermission({
      slug,
      module,
      action,
      description: getOptionalString(req.body?.description),
    });

    return sendSuccess(
      res,
      { permission: toPublicPermission(permission) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("permissions.write"), async (req: Request, res: Response) => {
  try {
    const permission = await updatePermission(req.params.id, {
      slug: getOptionalString(req.body?.slug) ?? undefined,
      module: getOptionalString(req.body?.module) ?? undefined,
      action: getOptionalString(req.body?.action) ?? undefined,
      description:
        req.body?.description === undefined
          ? undefined
          : getOptionalString(req.body?.description),
    });

    return sendSuccess(res, { permission: toPublicPermission(permission) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("permissions.delete"), async (req: Request, res: Response) => {
  try {
    await deletePermission(req.params.id);
    return sendSuccess(res, { message: "Permission deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerPermissionRoutes(app: import("express").Express) {
  app.use("/api/permissions", router);
}
