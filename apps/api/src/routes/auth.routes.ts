import type { Express, Request, Response } from "express";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import {
  getUserPermissions,
  loginWithPassword,
  logout,
  refreshAccessToken,
  requestPasswordReset,
  resetPasswordWithToken,
} from "../services/auth.service";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const result = await loginWithPassword(email, password);
      return sendSuccess(res, result);
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post("/api/auth/token", async (req: Request, res: Response) => {
    try {
      const grantType = typeof req.body?.grant_type === "string" ? req.body.grant_type : "";

      if (grantType === "password") {
        const email = typeof req.body?.email === "string" ? req.body.email : "";
        const password = typeof req.body?.password === "string" ? req.body.password : "";
        const result = await loginWithPassword(email, password);
        return sendSuccess(res, result);
      }

      if (grantType === "refresh_token") {
        const refreshToken =
          typeof req.body?.refresh_token === "string" ? req.body.refresh_token : "";
        const result = await refreshAccessToken(refreshToken);
        return sendSuccess(res, result);
      }

      return sendError(res, "Unsupported grant_type. Use 'password' or 'refresh_token'.", 400);
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const refreshToken =
        typeof req.body?.refresh_token === "string" ? req.body.refresh_token : "";
      const result = await logout(refreshToken);
      return sendSuccess(res, result, { message: result.message });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.get("/api/auth/me", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const permissions = await getUserPermissions(userId);
      return sendSuccess(res, { user: req.user, permissions });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email : "";
      const result = await requestPasswordReset(email);
      return sendSuccess(res, result, { message: result.message });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const token = typeof req.body?.token === "string" ? req.body.token : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const result = await resetPasswordWithToken(token, password);
      return sendSuccess(res, result, { message: result.message });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });
}
