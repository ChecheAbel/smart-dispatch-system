import type { ApiErrorResponse, AuthMeResponse, AuthTokenResponse } from "@smart-dispatch/types";
import axios from "axios";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";
import { performTokenRefresh } from "./auth-token-refresh";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  updateAuthSession,
  updateStoredSession,
} from "./auth-session";

export class AuthRequestError extends Error {
  accountBlockReason?: string | null;

  constructor(message: string, accountBlockReason?: string | null) {
    super(message);
    this.name = "AuthRequestError";
    this.accountBlockReason = accountBlockReason ?? null;
  }
}

function getAccountBlockReason(error: unknown) {
  if (error instanceof AuthRequestError) {
    return error.accountBlockReason?.trim() || null;
  }

  if (error instanceof Error && "accountBlockReason" in error) {
    const reason = (error as Error & { accountBlockReason?: string | null }).accountBlockReason;
    return reason?.trim() || null;
  }

  return null;
}

export async function login(username: string, password: string) {
  try {
    const { data } = await apiClient.post("/api/auth/login", {
      username: username.trim(),
      password,
    });
    return unwrapApiResponse<AuthTokenResponse>(data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as Partial<ApiErrorResponse> | undefined;
      if (body?.success === false && typeof body.error === "string") {
        throw new AuthRequestError(body.error, body.account_block_reason);
      }
    }

    const message =
      error instanceof Error ? error.message : "Sign in failed. Please try again.";
    const accountBlockReason = getAccountBlockReason(error);

    if (accountBlockReason) {
      throw new AuthRequestError(message, accountBlockReason);
    }

    throw error instanceof Error ? error : new Error("Sign in failed. Please try again.");
  }
}

export async function getCurrentSession() {
  const { data } = await apiClient.get("/api/auth/me");
  return unwrapApiResponse<AuthMeResponse>(data);
}

export async function refreshSession(refreshToken: string) {
  const result = await performTokenRefresh(refreshToken);
  if (!result) {
    throw new Error("Invalid or expired refresh token.");
  }
  return result;
}

/** Validates stored credentials with the API and returns the session when still authorized. */
export async function resumeAdminSession(): Promise<AuthMeResponse | null> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken && !refreshToken) {
    return null;
  }

  if (accessToken) {
    try {
      const session = await getCurrentSession();
      if (!session.user.roles.includes("admin")) {
        clearAuthSession();
        return null;
      }

      updateStoredSession(session);
      return session;
    } catch {
      // Access token expired or invalid — try refresh below.
    }
  }

  if (refreshToken) {
    try {
      const tokenResponse = await refreshSession(refreshToken);
      if (!tokenResponse.user.roles.includes("admin")) {
        clearAuthSession();
        return null;
      }

      updateAuthSession(tokenResponse);
      return {
        user: tokenResponse.user,
        permissions: tokenResponse.permissions ?? [],
      };
    } catch {
      clearAuthSession();
      return null;
    }
  }

  clearAuthSession();
  return null;
}

/** Validates stored credentials and returns the session for customer accounts. */
export async function resumeUserSession(): Promise<AuthMeResponse | null> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken && !refreshToken) {
    return null;
  }

  if (accessToken) {
    try {
      const session = await getCurrentSession();
      if (!session.user.roles.includes("user")) {
        clearAuthSession();
        return null;
      }

      updateStoredSession(session);
      return session;
    } catch {
      // Access token expired or invalid — try refresh below.
    }
  }

  if (refreshToken) {
    try {
      const tokenResponse = await refreshSession(refreshToken);
      if (!tokenResponse.user.roles.includes("user")) {
        clearAuthSession();
        return null;
      }

      updateAuthSession(tokenResponse);
      return {
        user: tokenResponse.user,
        permissions: tokenResponse.permissions ?? [],
      };
    } catch {
      clearAuthSession();
      return null;
    }
  }

  clearAuthSession();
  return null;
}

export async function requestPasswordReset(email: string) {
  const { data } = await apiClient.post("/api/auth/forgot-password", { email });
  return unwrapApiResponse<{ message: string }>(data);
}

export async function resetPassword(token: string, password: string) {
  const { data } = await apiClient.post("/api/auth/reset-password", { token, password });
  return unwrapApiResponse<{ message: string }>(data);
}

export type RegisterDriverInput = {
  email: string;
  password: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  mobile_number: string;
  driver_license_number: string;
  driver_license_photo: File;
};

export type RegisterUserInput = {
  email: string;
  password: string;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  mobile_number: string;
  segment: "individual" | "business" | "government";
  organization_name?: string | null;
  job_title?: string | null;
  organization_address?: string | null;
  tax_id?: string | null;
  registration_number?: string | null;
  government_entity_type?: string | null;
  official_reference?: string | null;
  billing_contact_name?: string | null;
  billing_contact_email?: string | null;
};

export async function registerUserApplication(input: RegisterUserInput) {
  const { data } = await apiClient.post("/api/auth/register-user", input);
  return unwrapApiResponse<{ message: string }>(data);
}

export async function registerDriverApplication(input: RegisterDriverInput) {
  const formData = new FormData();
  formData.append("email", input.email);
  formData.append("password", input.password);
  formData.append("first_name", input.first_name);
  if (input.middle_name) {
    formData.append("middle_name", input.middle_name);
  }
  formData.append("last_name", input.last_name);
  formData.append("mobile_number", input.mobile_number);
  formData.append("driver_license_number", input.driver_license_number);
  formData.append("driver_license_photo", input.driver_license_photo);

  const { data } = await apiClient.post("/api/auth/register-driver", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrapApiResponse<{ message: string }>(data);
}
