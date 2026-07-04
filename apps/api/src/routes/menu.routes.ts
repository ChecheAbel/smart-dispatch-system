import { Router, type Request, type Response } from "express";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { buildMenuTree, toPublicMenu } from "../mappers/menu.mapper";
import {
  countMenus,
  createMenu,
  deleteMenu,
  findMenuById,
  findMenuBySlug,
  hasDefaultLocaleMenuTranslation,
  listMenus,
  listMenusForUser,
  updateMenu,
} from "../models/menu.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import {
  getMenuTranslations,
  getOptionalString,
  getString,
  getStringArray,
  parseBoolean,
} from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

router.get("/navigation", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, "Unauthorized.", 401);
    }

    const menus = await listMenusForUser(userId);
    const publicMenus = menus.map((menu) => toPublicMenu(menu, { locale }));

    return sendSuccess(res, {
      menus: buildMenuTree(publicMenus),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.use(authenticate, authorize("admin"));

router.get("/", requirePermission("menus.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      isActive: parseBoolean(req.query.is_active),
    };

    const result = await paginate(
      pagination,
      () => countMenus(filter),
      (skip, take) => listMenus(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((menu) => toPublicMenu(menu, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/slug/:slug", requirePermission("menus.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const menu = await findMenuBySlug(req.params.slug);
    if (!menu) {
      return sendError(res, "Menu not found.", 404);
    }

    return sendSuccess(res, {
      menu: toPublicMenu(menu, { locale, includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("menus.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const menu = await findMenuById(req.params.id);
    if (!menu) {
      return sendError(res, "Menu not found.", 404);
    }

    return sendSuccess(res, {
      menu: toPublicMenu(menu, { locale, includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", requirePermission("menus.write"), async (req: Request, res: Response) => {
  try {
    const slug = getString(req.body?.slug);
    const translations = getMenuTranslations(req.body?.translations);

    if (!slug) {
      return sendError(res, "Slug is required.", 400);
    }

    if (!translations.length) {
      return sendError(res, "At least one translation is required.", 400);
    }

    if (!hasDefaultLocaleMenuTranslation(translations)) {
      return sendError(res, "An English (en) translation is required.", 400);
    }

    const menu = await createMenu({
      slug,
      path: getOptionalString(req.body?.path),
      icon: getOptionalString(req.body?.icon),
      parentId: getOptionalString(req.body?.parent_id),
      sortOrder:
        typeof req.body?.sort_order === "number" ? req.body.sort_order : undefined,
      permissionIds: getStringArray(req.body?.permission_ids),
      translations,
      isActive: parseBoolean(req.body?.is_active),
    });

    return sendSuccess(
      res,
      { menu: toPublicMenu(menu, { includeAllTranslations: true }) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("menus.write"), async (req: Request, res: Response) => {
  try {
    const translations = getMenuTranslations(req.body?.translations);
    const menu = await updateMenu(req.params.id, {
      slug: getOptionalString(req.body?.slug) ?? undefined,
      path: req.body?.path === undefined ? undefined : getOptionalString(req.body?.path),
      icon: req.body?.icon === undefined ? undefined : getOptionalString(req.body?.icon),
      parentId:
        req.body?.parent_id === undefined ? undefined : getOptionalString(req.body?.parent_id),
      sortOrder:
        typeof req.body?.sort_order === "number" ? req.body.sort_order : undefined,
      permissionIds:
        req.body?.permission_ids === undefined
          ? undefined
          : getStringArray(req.body?.permission_ids),
      translations: translations.length ? translations : undefined,
      isActive: parseBoolean(req.body?.is_active),
    });

    return sendSuccess(res, {
      menu: toPublicMenu(menu, { includeAllTranslations: true }),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("menus.delete"), async (req: Request, res: Response) => {
  try {
    await deleteMenu(req.params.id);
    return sendSuccess(res, { message: "Menu deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerMenuRoutes(app: import("express").Express) {
  app.use("/api/menus", router);
}
