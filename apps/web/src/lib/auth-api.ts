import type { AuthTokenResponse } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";

export async function login(email: string, password: string) {
  const { data } = await apiClient.post("/api/auth/login", { email, password });
  return unwrapApiResponse<AuthTokenResponse>(data);
}

export async function requestPasswordReset(email: string) {
  const { data } = await apiClient.post("/api/auth/forgot-password", { email });
  return unwrapApiResponse<{ message: string }>(data);
}

export async function resetPassword(token: string, password: string) {
  const { data } = await apiClient.post("/api/auth/reset-password", { token, password });
  return unwrapApiResponse<{ message: string }>(data);
}
