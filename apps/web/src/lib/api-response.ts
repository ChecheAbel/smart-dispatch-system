import type { ApiPaginatedResponse, ApiResponse } from "@smart-dispatch/types";

export function unwrapApiResponse<T>(body: unknown): T {
  const payload = body as Partial<ApiResponse<T>>;

  if (payload.success === false) {
    throw new Error(payload.error);
  }

  if (payload.success !== true || payload.data === undefined || Array.isArray(payload.data)) {
    throw new Error("Something went wrong. Please try again.");
  }

  return payload.data;
}

export function unwrapPaginatedApiResponse<T>(body: unknown): ApiPaginatedResponse<T> {
  const payload = body as Partial<ApiPaginatedResponse<T> | { success: false; error: string }>;

  if (payload.success === false) {
    throw new Error(payload.error);
  }

  if (payload.success !== true || !Array.isArray(payload.data) || !payload.pagination) {
    throw new Error("Something went wrong. Please try again.");
  }

  return payload as ApiPaginatedResponse<T>;
}
