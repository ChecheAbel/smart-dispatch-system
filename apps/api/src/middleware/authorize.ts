import type { NextFunction, Response } from "express";
import type { RoleSlug } from "@smart-dispatch/types";
import { sendError } from "../utils/response";
import type { AuthenticatedRequest } from "./authenticate";

export function authorize(...allowedRoles: RoleSlug[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, "Unauthorized.", 401);
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return sendError(res, "Forbidden.", 403);
    }

    return next();
  };
}
