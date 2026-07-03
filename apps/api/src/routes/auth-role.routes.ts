import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { toPublicAuthRole } from "../mappers/auth-role.mapper";
import {
  assignRoleToUser,
  countAuthRoles,
  findAuthRole,
  listAuthRoles,
  removeRoleFromUser,
} from "../models/auth-role.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import { getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

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
      userId: getString(req.query.user_id) || undefined,
      roleId: getString(req.query.role_id) || undefined,
    };

    const result = await paginate(
      pagination,
      () => countAuthRoles(filter),
      (skip, take) => listAuthRoles(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((authRole) => toPublicAuthRole(authRole, { locale })),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:userId/:roleId", async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const authRole = await findAuthRole(req.params.userId, req.params.roleId);
    if (!authRole) {
      return sendError(res, "Role assignment not found.", 404);
    }

    return sendSuccess(res, { auth_role: toPublicAuthRole(authRole, { locale }) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const userId = getString(req.body?.user_id);
    const roleId = getString(req.body?.role_id);

    if (!userId || !roleId) {
      return sendError(res, "user_id and role_id are required.", 400);
    }

    const authRole = await assignRoleToUser(userId, roleId);
    return sendSuccess(res, { auth_role: toPublicAuthRole(authRole, { locale }) }, { status: 201 });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:userId/:roleId", async (req: Request, res: Response) => {
  try {
    await removeRoleFromUser(req.params.userId, req.params.roleId);
    return sendSuccess(res, { message: "Role assignment removed." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerAuthRoleRoutes(app: import("express").Express) {
  app.use("/api/auth-roles", router);
}
