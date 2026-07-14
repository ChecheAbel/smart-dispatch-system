import type { Express, Request, Response } from "express";
import multer from "multer";
import { authenticate, type AuthenticatedRequest } from "../middleware/authenticate";
import {
  changeMyPassword,
  getUserPermissions,
  loginWithPassword,
  logout,
  refreshAccessToken,
  registerDriverApplication,
  registerUserApplication,
  requestPasswordReset,
  resetPasswordWithToken,
  updateMyProfile,
} from "../services/auth.service";
import { recordAuditLog } from "../services/audit-log.service";
import { queueUserRegistrationNotifications } from "../services/notification-dispatch.service";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";
import {
  getOptionalString,
  getString,
  isValidEmail,
  isValidDriverLicenseNumber,
  isValidEthiopianMobileNumber,
  normalizeDriverLicenseNumber,
  normalizeEthiopianMobileNumber,
} from "../utils/validation";
import {
  buildDriverLicensePhotoUrl,
  driverLicensePhotoUpload,
} from "../utils/driver-license-upload";
import {
  parseRequesterProfileInput,
  validateRequesterProfileInput,
} from "../utils/requester-profile";

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register-user", async (req: Request, res: Response) => {
    try {
      const email = getString(req.body?.email);
      const password = getString(req.body?.password);
      const firstName = getString(req.body?.first_name);
      const lastName = getString(req.body?.last_name);
      const mobileInput = getString(req.body?.mobile_number);
      const requesterProfile = validateRequesterProfileInput(parseRequesterProfileInput(req.body));

      if (!isValidEmail(email)) {
        return sendError(res, "A valid email address is required.", 400);
      }

      if (!password || password.length < 8) {
        return sendError(res, "Password must be at least 8 characters.", 400);
      }

      if (!firstName || !lastName || !mobileInput) {
        return sendError(
          res,
          "First name, last name, and mobile number are required.",
          400,
        );
      }

      const mobileNumber = normalizeEthiopianMobileNumber(mobileInput);
      if (!mobileNumber || !isValidEthiopianMobileNumber(mobileInput)) {
        return sendError(
          res,
          "Enter a valid 9-digit number starting with 9 (Ethio Telecom) or 7 (Safaricom).",
          400,
        );
      }

      const result = await registerUserApplication({
        email,
        password,
        firstName,
        middleName: getOptionalString(req.body?.middle_name),
        lastName,
        mobileNumber,
        requesterProfile,
      });

      if (result.userId) {
        queueUserRegistrationNotifications("submitted", result.userId);
      }

      return sendSuccess(res, result, { status: 201, message: result.message });
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post("/api/auth/register-driver", (req: Request, res: Response) => {
    driverLicensePhotoUpload.single("driver_license_photo")(req, res, async (uploadError) => {
      if (uploadError) {
        if (uploadError instanceof multer.MulterError) {
          if (uploadError.code === "LIMIT_FILE_SIZE") {
            return sendError(res, "Driver license photo must be 5 MB or smaller.", 400);
          }
          return sendError(res, uploadError.message, 400);
        }

        return sendError(
          res,
          uploadError instanceof Error ? uploadError.message : "Upload failed.",
          400,
        );
      }

      try {
        if (!req.file) {
          return sendError(res, "Driver license photo is required.", 400);
        }

        const email = getString(req.body?.email);
        const password = getString(req.body?.password);
        const firstName = getString(req.body?.first_name);
        const lastName = getString(req.body?.last_name);
        const mobileInput = getString(req.body?.mobile_number);
        const licenseInput = getString(req.body?.driver_license_number);

        if (!isValidEmail(email)) {
          return sendError(res, "A valid email address is required.", 400);
        }

        if (!password || password.length < 8) {
          return sendError(res, "Password must be at least 8 characters.", 400);
        }

        if (!firstName || !lastName || !mobileInput || !licenseInput) {
          return sendError(
            res,
            "First name, last name, mobile number, and driver license number are required.",
            400,
          );
        }

        const mobileNumber = normalizeEthiopianMobileNumber(mobileInput);
        if (!mobileNumber || !isValidEthiopianMobileNumber(mobileInput)) {
          return sendError(
            res,
            "Enter a valid 9-digit number starting with 9 (Ethio Telecom) or 7 (Safaricom).",
            400,
          );
        }

        const driverLicenseNumber = normalizeDriverLicenseNumber(licenseInput);
        if (!driverLicenseNumber || !isValidDriverLicenseNumber(licenseInput)) {
          return sendError(res, "Enter a valid driver license number.", 400);
        }

        const result = await registerDriverApplication({
          email,
          password,
          firstName,
          middleName: getOptionalString(req.body?.middle_name),
          lastName,
          mobileNumber,
          driverLicenseNumber,
          driverLicensePhotoUrl: buildDriverLicensePhotoUrl(req.file.filename),
        });

        return sendSuccess(res, result, { status: 201, message: result.message });
      } catch (error) {
        return handleRouteError(res, error);
      }
    });
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const result = await loginWithPassword(email, password);

      await recordAuditLog({
        req,
        actorUserId: result.user.id,
        action: "login",
        module: "auth",
        entityType: "user",
        entityId: result.user.id,
        entityLabel: result.user.email,
        summary: "User signed in",
      });

      return sendSuccess(res, result);
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.post("/api/auth/token", async (req: Request, res: Response) => {
    try {
      const refreshToken =
        typeof req.body?.refresh_token === "string" ? req.body.refresh_token : "";

      if (!refreshToken) {
        return sendError(res, "refresh_token is required.", 400);
      }

      const result = await refreshAccessToken(refreshToken);
      return sendSuccess(res, result);
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

  app.patch("/api/auth/me", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const result = await updateMyProfile(userId, {
        email: getString(req.body?.email),
        firstName: getString(req.body?.first_name),
        middleName: getOptionalString(req.body?.middle_name),
        lastName: getString(req.body?.last_name),
        mobileNumber: getString(req.body?.mobile_number),
      });

      return sendSuccess(res, result);
    } catch (error) {
      return handleRouteError(res, error);
    }
  });

  app.patch("/api/auth/password", authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return sendError(res, "Unauthorized.", 401);
      }

      const result = await changeMyPassword(
        userId,
        getString(req.body?.current_password),
        getString(req.body?.new_password),
      );

      return sendSuccess(res, result, { message: result.message });
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
