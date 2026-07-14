import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import {
  getDeadlineSettings,
  updateDeadlineSettings,
} from "../models/app-setting.model";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

const router = Router();

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

export function registerSystemSettingsRoutes(app: import("express").Express) {
  app.use("/api/admin/system-settings", router);
}
