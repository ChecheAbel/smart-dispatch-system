import multer from "multer";
import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import {
  getBrandingSettings,
  getDeadlineSettings,
  updateBrandingSettings,
  updateDeadlineSettings,
  type BrandingSettings,
} from "../models/app-setting.model";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";
import { getOptionalString, getString } from "../utils/validation";
import {
  brandLogoUpload,
  buildBrandLogoUrl,
  removeBrandLogoFile,
} from "../utils/brand-logo-upload";

const router = Router();
const publicRouter = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

function isHexColor(value: string) {
  return HEX_COLOR_PATTERN.test(value);
}

function parseBrandingBody(body: Record<string, unknown>): BrandingSettings | null {
  const current = getBrandingSettings();
  const companyName = getString(body.company_name) || current.company_name;
  const productName = getString(body.product_name) || current.product_name;
  const primaryColor = getString(body.primary_color) || current.primary_color;
  const accentColor = getString(body.accent_color) || current.accent_color;

  if (!isHexColor(primaryColor) || !isHexColor(accentColor)) {
    return null;
  }

  const supportEmail =
    body.support_email === undefined
      ? current.support_email
      : getOptionalString(body.support_email);
  const supportPhone =
    body.support_phone === undefined
      ? current.support_phone
      : getOptionalString(body.support_phone);
  const websiteUrl =
    body.website_url === undefined
      ? current.website_url
      : getOptionalString(body.website_url);
  const logoUrl =
    body.logo_url === undefined
      ? current.logo_url
      : getOptionalString(body.logo_url);

  if (
    supportEmail === undefined ||
    supportPhone === undefined ||
    websiteUrl === undefined ||
    logoUrl === undefined
  ) {
    return null;
  }

  if (supportEmail && !EMAIL_PATTERN.test(supportEmail)) {
    return null;
  }

  return {
    company_name: companyName,
    product_name: productName,
    logo_url: logoUrl,
    primary_color: primaryColor,
    accent_color: accentColor,
    support_email: supportEmail,
    support_phone: supportPhone,
    website_url: websiteUrl,
  };
}

router.use(authenticate, authorize("admin"));

router.get(
  "/deadline",
  requirePermission("system_settings.read"),
  async (_req: Request, res: Response) => {
    try {
      return sendSuccess(res, getDeadlineSettings());
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.patch(
  "/deadline",
  requirePermission("system_settings.write"),
  async (req: Request, res: Response) => {
    try {
      const parsePositiveInt = (value: unknown, min: number, max: number) => {
        const parsed =
          typeof value === "number" ? Math.trunc(value) : Number(value);
        return Number.isFinite(parsed) && parsed >= min && parsed <= max
          ? parsed
          : null;
      };

      const ride_request_cancel_grace_minutes = parsePositiveInt(
        req.body?.ride_request_cancel_grace_minutes,
        1,
        1440,
      );
      const ride_request_edit_grace_minutes = parsePositiveInt(
        req.body?.ride_request_edit_grace_minutes,
        1,
        1440,
      );
      const invoice_due_soon_days = parsePositiveInt(
        req.body?.invoice_due_soon_days,
        1,
        365,
      );
      const insurance_due_soon_days = parsePositiveInt(
        req.body?.insurance_due_soon_days,
        1,
        3650,
      );
      const inspection_due_soon_days = parsePositiveInt(
        req.body?.inspection_due_soon_days,
        1,
        3650,
      );

      if (
        ride_request_cancel_grace_minutes == null ||
        ride_request_edit_grace_minutes == null ||
        invoice_due_soon_days == null ||
        insurance_due_soon_days == null ||
        inspection_due_soon_days == null
      ) {
        return sendError(res, "Enter valid deadline values.", 400);
      }

      await updateDeadlineSettings({
        ride_request_cancel_grace_minutes,
        ride_request_edit_grace_minutes,
        invoice_due_soon_days,
        insurance_due_soon_days,
        inspection_due_soon_days,
      });

      return sendSuccess(res, getDeadlineSettings());
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.get(
  "/branding",
  requirePermission("system_settings.read"),
  async (_req: Request, res: Response) => {
    try {
      return sendSuccess(res, { branding: getBrandingSettings() });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.patch(
  "/branding",
  requirePermission("system_settings.write"),
  async (req: Request, res: Response) => {
    try {
      const parsed = parseBrandingBody((req.body ?? {}) as Record<string, unknown>);
      if (!parsed) {
        return sendError(res, "Enter valid branding values.", 400);
      }

      const branding = await updateBrandingSettings(parsed);
      return sendSuccess(res, { branding });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/branding/logo",
  requirePermission("system_settings.write"),
  (req: Request, res: Response) => {
    brandLogoUpload.single("logo")(req, res, async (uploadError) => {
      if (uploadError) {
        if (uploadError instanceof multer.MulterError) {
          if (uploadError.code === "LIMIT_FILE_SIZE") {
            return sendError(res, "Brand logo must be 5 MB or smaller.", 400);
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
        const file = req.file;
        if (!file) {
          return sendError(res, "Brand logo file is required.", 400);
        }

        const previous = getBrandingSettings();
        const logoUrl = buildBrandLogoUrl(file.filename);
        const branding = await updateBrandingSettings({
          ...previous,
          logo_url: logoUrl,
        });

        if (previous.logo_url && previous.logo_url !== logoUrl) {
          removeBrandLogoFile(previous.logo_url);
        }

        return sendSuccess(res, { branding });
      } catch (error) {
        return handleRouteError(res, error);
      }
    });
  },
);

publicRouter.get("/branding", async (_req: Request, res: Response) => {
  try {
    return sendSuccess(res, { branding: getBrandingSettings() });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerSystemSettingsRoutes(app: import("express").Express) {
  app.use("/api/admin/system-settings", router);
  app.use("/api/public", publicRouter);
}
