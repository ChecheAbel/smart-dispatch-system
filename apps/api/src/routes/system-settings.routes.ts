import multer from "multer";
import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import {
  getBrandingSettings,
  getDeadlineSettings,
  getPaymentGatewaySettings,
  getVatSettings,
  parsePaymentGatewayValue,
  updateBrandingSettings,
  updateDeadlineSettings,
  updatePaymentGatewaySettings,
  updateVatSettings,
  type BrandingSettings,
  type PaymentGatewaySettings,
} from "../models/app-setting.model";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";
import { getOptionalString, getString } from "../utils/validation";
import {
  brandLogoUpload,
  buildBrandLogoUrl,
  removeBrandLogoFile,
} from "../utils/brand-logo-upload";
import {
  buildPaymentMethodLogoUrl,
  paymentMethodLogoUpload,
  removePaymentMethodLogoFile,
} from "../utils/payment-method-logo-upload";

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
      const ride_request_reminder_hours = parsePositiveInt(
        req.body?.ride_request_reminder_hours,
        1,
        168,
      );
      const dispatch_escalate_dispatcher_minutes = parsePositiveInt(
        req.body?.dispatch_escalate_dispatcher_minutes,
        1,
        1440,
      );
      const dispatch_escalate_supervisor_minutes = parsePositiveInt(
        req.body?.dispatch_escalate_supervisor_minutes,
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
        ride_request_reminder_hours == null ||
        dispatch_escalate_dispatcher_minutes == null ||
        dispatch_escalate_supervisor_minutes == null ||
        invoice_due_soon_days == null ||
        insurance_due_soon_days == null ||
        inspection_due_soon_days == null
      ) {
        return sendError(res, "Enter valid deadline values.", 400);
      }

      if (dispatch_escalate_supervisor_minutes < dispatch_escalate_dispatcher_minutes) {
        return sendError(
          res,
          "Supervisor escalation wait must be at least the dispatcher wait.",
          400,
        );
      }

      await updateDeadlineSettings({
        ride_request_cancel_grace_minutes,
        ride_request_edit_grace_minutes,
        ride_request_reminder_hours,
        dispatch_escalate_dispatcher_minutes,
        dispatch_escalate_supervisor_minutes,
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
  "/vat",
  requirePermission("system_settings.read"),
  async (_req: Request, res: Response) => {
    try {
      return sendSuccess(res, getVatSettings());
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.patch(
  "/vat",
  requirePermission("system_settings.write"),
  async (req: Request, res: Response) => {
    try {
      const enabled = req.body?.enabled === true;
      const rateRaw =
        typeof req.body?.rate_percent === "number"
          ? req.body.rate_percent
          : Number(req.body?.rate_percent);
      const rate_percent = Number.isFinite(rateRaw)
        ? Math.round(rateRaw * 100) / 100
        : null;

      if (rate_percent == null || rate_percent < 0 || rate_percent > 100) {
        return sendError(res, "Enter a VAT rate between 0 and 100.", 400);
      }

      const vat = await updateVatSettings({ enabled, rate_percent });
      return sendSuccess(res, vat);
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

function parsePaymentGatewayBody(body: Record<string, unknown>): PaymentGatewaySettings | null {
  if (!Array.isArray(body.methods)) {
    return null;
  }

  const parsed = parsePaymentGatewayValue({ methods: body.methods });

  const ids = new Set<string>();
  for (const method of parsed.methods) {
    if (!method.name.trim()) {
      return null;
    }
    if (ids.has(method.id)) {
      return null;
    }
    ids.add(method.id);

    if (method.fields.some((field) => !field.key.trim())) {
      return null;
    }
  }

  return parsed;
}

router.get(
  "/payment-gateway",
  requirePermission("system_settings.read"),
  async (_req: Request, res: Response) => {
    try {
      return sendSuccess(res, { payment_gateway: getPaymentGatewaySettings() });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.patch(
  "/payment-gateway",
  requirePermission("system_settings.write"),
  async (req: Request, res: Response) => {
    try {
      const parsed = parsePaymentGatewayBody((req.body ?? {}) as Record<string, unknown>);
      if (!parsed) {
        return sendError(res, "Enter valid payment gateway methods.", 400);
      }

      const previous = getPaymentGatewaySettings();
      const paymentGateway = await updatePaymentGatewaySettings(parsed);

      const nextLogoUrls = new Set(
        paymentGateway.methods
          .map((method) => method.logo_url)
          .filter((url): url is string => Boolean(url)),
      );
      for (const method of previous.methods) {
        if (method.logo_url && !nextLogoUrls.has(method.logo_url)) {
          removePaymentMethodLogoFile(method.logo_url);
        }
      }

      return sendSuccess(res, { payment_gateway: paymentGateway });
    } catch (error) {
      return handleRouteError(res, error);
    }
  },
);

router.post(
  "/payment-gateway/logo",
  requirePermission("system_settings.write"),
  (req: Request, res: Response) => {
    paymentMethodLogoUpload.single("logo")(req, res, (uploadError) => {
      if (uploadError) {
        if (uploadError instanceof multer.MulterError) {
          if (uploadError.code === "LIMIT_FILE_SIZE") {
            return sendError(res, "Payment method logo must be 5 MB or smaller.", 400);
          }
          return sendError(res, uploadError.message, 400);
        }

        return sendError(
          res,
          uploadError instanceof Error ? uploadError.message : "Upload failed.",
          400,
        );
      }

      const file = req.file;
      if (!file) {
        return sendError(res, "Payment method logo file is required.", 400);
      }

      return sendSuccess(res, { logo_url: buildPaymentMethodLogoUrl(file.filename) });
    });
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
