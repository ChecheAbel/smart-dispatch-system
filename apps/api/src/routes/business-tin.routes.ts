import { Router, type Request, type Response } from "express";
import {
  BusinessTinLookupError,
  lookupBusinessLicense,
  lookupBusinessTin,
} from "../services/etrade-registration.service";
import { getString } from "../utils/validation";
import { handleRouteError, sendError, sendSuccess } from "../utils/response";

const router = Router();

router.get("/:tin/license", async (req: Request, res: Response) => {
  try {
    const license = await lookupBusinessLicense(
      req.params.tin,
      getString(req.query.license_no) || getString(req.query.licenseNo),
    );
    return sendSuccess(res, { license });
  } catch (error) {
    if (error instanceof BusinessTinLookupError) {
      return sendError(res, error.message, error.statusCode);
    }

    return handleRouteError(res, error);
  }
});

router.get("/:tin", async (req: Request, res: Response) => {
  try {
    const registration = await lookupBusinessTin(req.params.tin);
    return sendSuccess(res, { registration });
  } catch (error) {
    if (error instanceof BusinessTinLookupError) {
      return sendError(res, error.message, error.statusCode);
    }

    return handleRouteError(res, error);
  }
});

export function registerBusinessTinRoutes(app: import("express").Express) {
  app.use("/api/business-tin", router);
}
