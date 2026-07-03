import type { NextFunction, Request, Response } from "express";
import { getUserFromAccessToken } from "../services/auth.service";
import type { User } from "@smart-dispatch/types";
import { handleRouteError, sendError } from "../utils/response";

export type AuthenticatedRequest = Request & {
  user?: User;
};

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return sendError(res, "Missing or invalid authorization header.", 401);
  }

  const accessToken = header.slice("Bearer ".length).trim();
  if (!accessToken) {
    return sendError(res, "Missing access token.", 401);
  }

  try {
    req.user = await getUserFromAccessToken(accessToken);
    return next();
  } catch (error) {
    return handleRouteError(res, error);
  }
}
