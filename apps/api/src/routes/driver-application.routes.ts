import { Router, type Request, type Response } from "express";
import type { Express } from "express";
import { auditMutations } from "../middleware/audit-mutation";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { requirePermission } from "../middleware/require-permission";
import { toPublicDriverApplication } from "../mappers/driver-application.mapper";
import {
  countPendingDriverApplications,
  findPendingDriverApplicationById,
  listPendingDriverApplications,
} from "../models/driver-application.model";
import { findUserByIdWithRoles } from "../models/user.model";
import {
  approveDriverApplication,
  rejectDriverApplication,
} from "../services/driver-application.service";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import { getString } from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"), auditMutations());

router.get("/", requirePermission("drivers.read"), async (req: Request, res: Response) => {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
    };

    const result = await paginate(
      pagination,
      () => countPendingDriverApplications(filter),
      (skip, take) => listPendingDriverApplications(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((application) => toPublicDriverApplication(application)),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/count", requirePermission("drivers.read"), async (req: Request, res: Response) => {
  try {
    const count = await countPendingDriverApplications();
    return sendSuccess(res, { count });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", requirePermission("drivers.read"), async (req: Request, res: Response) => {
  try {
    const application = await findPendingDriverApplicationById(req.params.id);
    if (!application) {
      return sendError(res, "Driver application not found.", 404);
    }

    return sendSuccess(res, {
      application: toPublicDriverApplication(application),
    });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/:id/approve", requirePermission("drivers.write"), async (req: Request, res: Response) => {
  try {
    await approveDriverApplication(req.params.id);
    const user = await findUserByIdWithRoles(req.params.id);
    if (!user?.driverProfile) {
      return sendSuccess(res, { message: "Driver application approved." }, { message: "Driver application approved." });
    }

    return sendSuccess(
      res,
      { application: toPublicDriverApplication(user) },
      { message: "Driver application approved." },
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/:id/reject", requirePermission("drivers.write"), async (req: Request, res: Response) => {
  try {
    await rejectDriverApplication(req.params.id);
    return sendSuccess(res, { message: "Driver application rejected." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerDriverApplicationRoutes(app: Express) {
  app.use("/api/driver-applications", router);
}
