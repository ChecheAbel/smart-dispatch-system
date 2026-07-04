import type { AuthMeResponse, AuthTokenResponse } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  updateAuthSession,
  updateStoredSession,
} from "./auth-session";

export async function login(email: string, password: string) {
  const { data } = await apiClient.post("/api/auth/login", { email, password });
  return unwrapApiResponse<AuthTokenResponse>(data);
}

export async function getCurrentSession() {
  const { data } = await apiClient.get("/api/auth/me");
  return unwrapApiResponse<AuthMeResponse>(data);
}

export async function refreshSession(refreshToken: string) {
  const { data } = await apiClient.post("/api/auth/token", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return unwrapApiResponse<AuthTokenResponse>(data);
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
