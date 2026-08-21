import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import multer from "multer";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicUsers, toPublicUserWithRating } from "../mappers/user.mapper";
import { toPublicRole } from "../mappers/role.mapper";
import {
  assignRoleToUser,
  listAuthRolesByUserId,
  removeRoleFromUser,
  replaceUserRoles,
} from "../models/auth-role.model";
import {
  countUsers,
  createUser,
  deleteUser,
  findUserByIdWithRoles,
  listUsers,
  updateUser,
  updateUserAccountActivation,
  updateUserAccountStatus,
} from "../models/user.model";
import { upsertDriverProfile } from "../models/driver.model";
import { queueUserRegistrationNotifications } from "../services/notification-dispatch.service";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { parseLocale } from "../utils/locale";
import {
  getOptionalString,
  getString,
  getStringArray,
  isValidDriverLicenseNumber,
  isValidEmail,
  normalizeDriverLicenseNumber,
  parseAccountActivation,
  parseAccountStatus,
  parseBoolean,
  parseRoleSlug,
} from "../utils/validation";
import { parseRequesterSegment } from "../utils/requester-profile";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";
import {
  buildDriverLicensePhotoUrl,
  driverLicensePhotoUpload,
} from "../utils/driver-license-upload";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

function getRequestLocale(req: Request) {
  return parseLocale(req.query, req.headers["accept-language"]);
}

router.get("/", requirePermission("users.read"), async (req: Request, res: Response) => {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      accountStatus: parseAccountStatus(req.query.account_status),
      accountActivation: parseAccountActivation(req.query.account_activation),
      roleSlug: parseRoleSlug(req.query.role_slug),
      requesterSegment: parseRequesterSegment(req.query.requester_segment) ?? undefined,
      hasRequesterProfile: parseBoolean(req.query.has_requester_profile),
      hasAssignedVehicle: parseBoolean(req.query.has_assigned_vehicle),
    };

    const result = await paginate(
      pagination,
      () => countUsers(filter),
      (skip, take) => listUsers(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      await toPublicUsers(result.data),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("users.read"), async (req: Request, res: Response) => {
  try {
    const user = await findUserByIdWithRoles(req.params.id);
    if (!user) {
      return sendError(res, "User not found.", 404);
    }

    return sendSuccess(res, { user: await toPublicUserWithRating(user) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

function driverLicenseUploadError(error: unknown) {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return "Driver license photo must be 5 MB or smaller.";
    }
    return error.message;
  }

  return error instanceof Error ? error.message : "Upload failed.";
}

router.put(
  "/:id/driver-profile",
  requirePermission("users.write"),
  (req: Request, res: Response) => {
    driverLicensePhotoUpload.fields([
      { name: "driver_license_photo_front", maxCount: 1 },
      { name: "driver_license_photo_back", maxCount: 1 },
    ])(req, res, async (uploadError) => {
      if (uploadError) {
        return sendError(res, driverLicenseUploadError(uploadError), 400);
      }

      try {
        const user = await findUserByIdWithRoles(req.params.id);
        if (!user) {
          return sendError(res, "User not found.", 404);
        }

        const licenseInput = getString(req.body?.driver_license_number);
        const licenseNumber = normalizeDriverLicenseNumber(licenseInput);
        if (!licenseNumber || !isValidDriverLicenseNumber(licenseInput)) {
          return sendError(res, "Enter a valid driver license number.", 400);
        }

        const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
        const frontFile = files?.driver_license_photo_front?.[0];
        const backFile = files?.driver_license_photo_back?.[0];

        await upsertDriverProfile({
          userId: user.id,
          licenseNumber,
          licensePhotoUrl: frontFile ? buildDriverLicensePhotoUrl(frontFile.filename) : undefined,
          licensePhotoBackUrl: backFile ? buildDriverLicensePhotoUrl(backFile.filename) : undefined,
        });

        const updated = await findUserByIdWithRoles(user.id);
        return sendSuccess(res, { user: await toPublicUserWithRating(updated ?? user) });
      } catch (error) {
        return handleRouteError(res, error);
      }
    });
  },
);

router.post("/", requirePermission("users.write"), async (req: Request, res: Response) => {
  try {
    const email = getString(req.body?.email);
    const password = getString(req.body?.password);
    const firstName = getString(req.body?.first_name);
    const lastName = getString(req.body?.last_name);
    const mobileNumber = getString(req.body?.mobile_number);

    if (!isValidEmail(email)) {
      return sendError(res, "A valid email address is required.", 400);
    }

    if (!password || password.length < 8) {
      return sendError(res, "Password must be at least 8 characters.", 400);
    }

    if (!firstName || !lastName || !mobileNumber) {
      return sendError(res, "First name, last name, and mobile number are required.", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await createUser({
      email,
      passwordHash,
      firstName,
      middleName: getOptionalString(req.body?.middle_name),
      lastName,
      mobileNumber,
      accountStatus: parseAccountStatus(req.body?.account_status),
      accountActivation: parseAccountActivation(req.body?.account_activation),
    });

    return sendSuccess(res, { user: await toPublicUserWithRating(user) }, { status: 201 });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:id", requirePermission("users.write"), async (req: Request, res: Response) => {
  try {
    const user = await updateUser(req.params.id, {
      email: getOptionalString(req.body?.email) ?? undefined,
      firstName: getOptionalString(req.body?.first_name) ?? undefined,
      middleName:
        req.body?.middle_name === undefined
          ? undefined
          : getOptionalString(req.body?.middle_name),
      lastName: getOptionalString(req.body?.last_name) ?? undefined,
      mobileNumber: getOptionalString(req.body?.mobile_number) ?? undefined,
      accountStatus: parseAccountStatus(req.body?.account_status),
      accountActivation: parseAccountActivation(req.body?.account_activation),
    });

    return sendSuccess(res, { user: await toPublicUserWithRating(user) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:id/account-status", requirePermission("users.write"), async (req: Request, res: Response) => {
  try {
    const accountStatus = parseAccountStatus(req.body?.account_status);
    if (!accountStatus) {
      return sendError(res, "A valid account_status is required.", 400);
    }

    const accountBlockReason = getOptionalString(req.body?.account_block_reason);
    if (accountStatus === "deactivated") {
      if (!accountBlockReason?.trim()) {
        return sendError(res, "A reason is required when deactivating an account.", 400);
      }
      if (accountBlockReason.trim().length > 500) {
        return sendError(res, "Reason must be 500 characters or fewer.", 400);
      }
    }

    const existing = await findUserByIdWithRoles(req.params.id);
    if (!existing) {
      return sendError(res, "User not found.", 404);
    }

    const user = await updateUserAccountStatus(
      req.params.id,
      accountStatus,
      accountBlockReason,
    );

    if (
      existing.accountActivation === "pending" &&
      existing.accountStatus === "active" &&
      accountStatus === "deactivated"
    ) {
      queueUserRegistrationNotifications("rejected", user.id, {
        rejectionReason: accountBlockReason,
      });
    }

    return sendSuccess(res, { user: await toPublicUserWithRating(user) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:id/account-activation", requirePermission("users.write"), async (req: Request, res: Response) => {
  try {
    const accountActivation = parseAccountActivation(req.body?.account_activation);
    if (!accountActivation) {
      return sendError(res, "A valid account_activation is required.", 400);
    }

    const existing = await findUserByIdWithRoles(req.params.id);
    if (!existing) {
      return sendError(res, "User not found.", 404);
    }

    const user = await updateUserAccountActivation(req.params.id, accountActivation);

    if (existing.accountActivation === "pending" && accountActivation === "activated") {
      queueUserRegistrationNotifications("approved", user.id);
    }

    return sendSuccess(res, { user: await toPublicUserWithRating(user) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", requirePermission("users.delete"), async (req: Request, res: Response) => {
  try {
    await deleteUser(req.params.id);
    return sendSuccess(res, { message: "User deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id/roles", requirePermission("users.read"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const authRoles = await listAuthRolesByUserId(req.params.id);
    return sendSuccess(res, {
      roles: authRoles.map((authRole) => toPublicRole(authRole.role, { locale })),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.put("/:id/roles", requirePermission("users.write"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const roleIds = getStringArray(req.body?.role_ids);
    const authRoles = await replaceUserRoles(req.params.id, roleIds);

    return sendSuccess(res, {
      roles: authRoles.map((authRole) => toPublicRole(authRole.role, { locale })),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/:id/roles", requirePermission("users.write"), async (req: Request, res: Response) => {
  try {
    const locale = getRequestLocale(req);
    const roleId = getString(req.body?.role_id);
    if (!roleId) {
      return sendError(res, "role_id is required.", 400);
    }

    const authRole = await assignRoleToUser(req.params.id, roleId);
    return sendSuccess(
      res,
      { role: toPublicRole(authRole.role, { locale }) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id/roles/:roleId", requirePermission("users.write"), async (req: Request, res: Response) => {
  try {
    await removeRoleFromUser(req.params.id, req.params.roleId);
    return sendSuccess(res, { message: "Role removed from user." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerUserRoutes(app: import("express").Express) {
  app.use("/api/users", router);
}
