import { Router, type Request, type Response } from "express";
import { ADMIN_ROLE_SLUG, isProtectedSystemRole } from "@smart-dispatch/types";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicRole } from "../mappers/role.mapper";
import {
  countRoles,
  createRole,
  deleteRole,
  findRoleById,
  findRoleBySlug,
  findUsersByRoleId,
  hasDefaultLocaleTranslation,
  listRoles,
  updateRole,
} from "../models/role.model";
import { findPermissionsByRoleId } from "../models/permission.model";
import { setRolePermissions } from "../models/role-permission.model";
import { toPublicPermission } from "../mappers/permission.mapper";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString, getString, getRoleTranslations, getStringArray } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";
import { toPublicUser } from "../mappers/user.mapper";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

router.get("/", requirePermission("roles.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
    };

    const result = await paginate(
      pagination,
      () => countRoles(filter),
      (skip, take) => listRoles(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((role) => toPublicRole(role, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/slug/:slug", requirePermission("roles.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const role = await findRoleBySlug(req.params.slug);
    if (!role) {
      return sendError(res, "Role not found.", 404);
    }

    return sendSuccess(res, {
      role: toPublicRole(role, { locale, includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id/permissions", requirePermission("roles.read"), async (req: Request, res: Response) => {
  try {
    const role = await findRoleById(req.params.id);
    if (!role) {
      return sendError(res, "Role not found.", 404);
    }

    const permissions = await findPermissionsByRoleId(req.params.id);
    return sendSuccess(res, {
      permissions: permissions.map((permission) => toPublicPermission(permission)),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put("/:id/permissions", requirePermission("roles.write"), async (req: Request, res: Response) => {
  try {
    const role = await findRoleById(req.params.id);
    if (!role) {
      return sendError(res, "Role not found.", 404);
    }

    if (isProtectedSystemRole(role)) {
      return sendError(res, "The Administrator role permissions cannot be changed.", 403);
    }

    const permissionIds = getStringArray(req.body?.permission_ids);
    const permissions = await setRolePermissions(req.params.id, permissionIds);

    return sendSuccess(res, {
      permissions: permissions.map((permission) => toPublicPermission(permission)),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("roles.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const role = await findRoleById(req.params.id);
    if (!role) {
      return sendError(res, "Role not found.", 404);
    }

    return sendSuccess(res, {
      role: toPublicRole(role, { locale, includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id/users", requirePermission("roles.read"), async (req: Request, res: Response) => {
  try {
    const users = await findUsersByRoleId(req.params.id);
    return sendSuccess(res, {
      users: users.map((user) => toPublicUser(user)),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("roles.write"), async (req: Request, res: Response) => {
  try {
    const slug = getString(req.body?.slug);
    const translations = getRoleTranslations(req.body?.translations);

    if (!slug) {
      return sendError(res, "Slug is required.", 400);
    }

    if (slug === ADMIN_ROLE_SLUG) {
      return sendError(res, "The Administrator role slug is reserved.", 400);
    }

    if (!translations.length) {
      return sendError(res, "At least one translation is required.", 400);
    }

    if (!hasDefaultLocaleTranslation(translations)) {
      return sendError(res, "An English (en) translation is required.", 400);
    }

    const role = await createRole({ slug, translations });

    return sendSuccess(
      res,
      { role: toPublicRole(role, { includeAllTranslations: true }) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("roles.write"), async (req: Request, res: Response) => {
  try {
    const existingRole = await findRoleById(req.params.id);
    if (!existingRole) {
      return sendError(res, "Role not found.", 404);
    }

    if (isProtectedSystemRole(existingRole)) {
      return sendError(res, "The Administrator role cannot be modified.", 403);
    }

    const nextSlug = getOptionalString(req.body?.slug) ?? undefined;
    if (nextSlug === ADMIN_ROLE_SLUG) {
      return sendError(res, "The Administrator role slug is reserved.", 400);
    }

    const translations = getRoleTranslations(req.body?.translations);
    const role = await updateRole(req.params.id, {
      slug: nextSlug,
      translations: translations.length ? translations : undefined,
    });

    return sendSuccess(res, {
      role: toPublicRole(role, { includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("roles.delete"), async (req: Request, res: Response) => {
  try {
    const role = await findRoleById(req.params.id);
    if (!role) {
      return sendError(res, "Role not found.", 404);
    }

    if (isProtectedSystemRole(role)) {
      return sendError(res, "The Administrator role cannot be deleted.", 403);
    }

    await deleteRole(req.params.id);
    return sendSuccess(res, { message: "Role deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerRoleRoutes(app: import("express").Express) {
  app.use("/api/roles", router);
}
