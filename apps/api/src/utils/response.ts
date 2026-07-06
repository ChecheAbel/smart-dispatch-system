import type { Response } from "express";
import type {
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from "@smart-dispatch/types";
import { Prisma } from "../generated/prisma";
import { AuthError } from "../services/auth.service";
import { RequesterProfileValidationError } from "./requester-profile";

export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: { status?: number; message?: string },
) {
  const body: ApiSuccessResponse<T> = { success: true, data };
  if (options?.message) {
    body.message = options.message;
  }
  return res.status(options?.status ?? 200).json(body);
}

export function sendPaginatedSuccess<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  options?: { status?: number; message?: string },
) {
  const body: ApiPaginatedResponse<T> = { success: true, data, pagination };
  if (options?.message) {
    body.message = options.message;
  }
  return res.status(options?.status ?? 200).json(body);
}

export function sendError(res: Response, error: string, status = 400) {
  const body: ApiErrorResponse = { success: false, error };
  return res.status(status).json(body);
}

export function handleRouteError(res: Response, error: unknown) {
  if (error instanceof AuthError) {
    const body: ApiErrorResponse = { success: false, error: error.message };
    if (error.accountBlockReason) {
      body.account_block_reason = error.accountBlockReason;
    }
    return res.status(error.status).json(body);
  }

  if (error instanceof RequesterProfileValidationError) {
    return sendError(res, error.message, 400);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return sendError(res, "A record with this value already exists.", 409);
    }
    if (error.code === "P2025") {
      return sendError(res, "Record not found.", 404);
    }
  }

  console.error(error);
  return sendError(res, "Internal server error.", 500);
}
