import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
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
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getOptionalString, getString, getRoleTranslations } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";
import { toPublicUser } from "../mappers/user.mapper";

const router = Router();

router.use(authenticate, authorize("admin"));

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

router.get("/", async (req: Request, res: Response) => {
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

router.get("/slug/:slug", async (req: Request, res: Response) => {
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

router.get("/:id", async (req: Request, res: Response) => {
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

router.get("/:id/users", async (req: Request, res: Response) => {
  try {
    const users = await findUsersByRoleId(req.params.id);
    return sendSuccess(res, {
      users: users.map((user) => toPublicUser(user)),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const slug = getString(req.body?.slug);
    const translations = getRoleTranslations(req.body?.translations);

    if (!slug) {
      return sendError(res, "Slug is required.", 400);
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

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const translations = getRoleTranslations(req.body?.translations);
    const role = await updateRole(req.params.id, {
      slug: getOptionalString(req.body?.slug) ?? undefined,
      translations: translations.length ? translations : undefined,
    });

    return sendSuccess(res, {
      role: toPublicRole(role, { includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await deleteRole(req.params.id);
    return sendSuccess(res, { message: "Role deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerRoleRoutes(app: import("express").Express) {
  app.use("/api/roles", router);
}
