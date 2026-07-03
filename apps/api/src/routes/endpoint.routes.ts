import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { toPublicEndpoint } from "../mappers/endpoint.mapper";
import {
  countEndpoints,
  createEndpoint,
  deleteEndpoint,
  findEndpointById,
  findEndpointBySlug,
  listEndpoints,
  updateEndpoint,
} from "../models/endpoint.model";
import { paginate, parsePaginationQuery } from "../services/pagination.service";
import {
  getOptionalString,
  getString,
  parseBoolean,
  parseHttpMethod,
} from "../utils/validation";
import { handleRouteError, sendError, sendPaginatedSuccess, sendSuccess } from "../utils/response";

const router = Router();

router.use(authenticate, authorize("admin"));

router.get("/", async (req: Request, res: Response) => {
  try {
    const pagination = parsePaginationQuery(req.query);
    const filter = {
      search: getString(req.query.search) || undefined,
      method: parseHttpMethod(req.query.method),
      isActive: parseBoolean(req.query.is_active),
    };

    const result = await paginate(
      pagination,
      () => countEndpoints(filter),
      (skip, take) => listEndpoints(filter, { skip, take }),
    );

    return sendPaginatedSuccess(
      res,
      result.data.map((endpoint) => toPublicEndpoint(endpoint)),
      result.pagination,
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    const endpoint = await findEndpointBySlug(req.params.slug);
    if (!endpoint) {
      return sendError(res, "Endpoint not found.", 404);
    }

    return sendSuccess(res, { endpoint: toPublicEndpoint(endpoint) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const endpoint = await findEndpointById(req.params.id);
    if (!endpoint) {
      return sendError(res, "Endpoint not found.", 404);
    }

    return sendSuccess(res, { endpoint: toPublicEndpoint(endpoint) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const slug = getString(req.body?.slug);
    const method = parseHttpMethod(req.body?.method);
    const path = getString(req.body?.path);

    if (!slug || !method || !path) {
      return sendError(res, "Slug, method, and path are required.", 400);
    }

    const endpoint = await createEndpoint({
      slug,
      method,
      path,
      description: getOptionalString(req.body?.description),
      permissionId: getOptionalString(req.body?.permission_id),
      isActive: parseBoolean(req.body?.is_active),
    });

    return sendSuccess(
      res,
      { endpoint: toPublicEndpoint(endpoint) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const method = parseHttpMethod(req.body?.method);
    const endpoint = await updateEndpoint(req.params.id, {
      slug: getOptionalString(req.body?.slug) ?? undefined,
      method,
      path: getOptionalString(req.body?.path) ?? undefined,
      description:
        req.body?.description === undefined
          ? undefined
          : getOptionalString(req.body?.description),
      permissionId:
        req.body?.permission_id === undefined
          ? undefined
          : getOptionalString(req.body?.permission_id),
      isActive: parseBoolean(req.body?.is_active),
    });

    return sendSuccess(res, { endpoint: toPublicEndpoint(endpoint) });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await deleteEndpoint(req.params.id);
    return sendSuccess(res, { message: "Endpoint deleted successfully." });
  } catch (error) {
    return handleRouteError(res, error);
  }
});

export function registerEndpointRoutes(app: import("express").Express) {
  app.use("/api/endpoints", router);
}
