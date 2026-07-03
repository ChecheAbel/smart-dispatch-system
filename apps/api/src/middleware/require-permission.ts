import type { NextFunction, Response } from "express";
import { findPermissionsByUserId } from "../models/permission.model";
import { sendError } from "../utils/response";
import type { AuthenticatedRequest } from "./authenticate";

export function requirePermission(...permissionSlugs: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Unauthorized.", 401);
    }

    if (!permissionSlugs.length) {
      return next();
    }

    const permissions = await findPermissionsByUserId(req.user.id);
    const grantedSlugs = new Set(permissions.map((permission) => permission.slug));
    const allowed = permissionSlugs.some((slug) => grantedSlugs.has(slug));

    if (!allowed) {
      return sendError(res, "Forbidden.", 403);
    }

    return next();
  };
}
