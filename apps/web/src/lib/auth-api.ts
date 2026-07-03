import type { AuthTokenResponse, User } from "@smart-dispatch/types";
import { apiClient } from "./api-client";
import { unwrapApiResponse } from "./api-response";
import {
  clearAuthSession,
  getAccessToken,
  getRefreshToken,
  updateAuthSession,
  updateStoredUser,
} from "./auth-session";

export async function login(email: string, password: string) {
  const { data } = await apiClient.post("/api/auth/login", { email, password });
  return unwrapApiResponse<AuthTokenResponse>(data);
}

export async function getCurrentUser() {
  const { data } = await apiClient.get("/api/auth/me");
  return unwrapApiResponse<{ user: User }>(data).user;
}

export async function refreshSession(refreshToken: string) {
  const { data } = await apiClient.post("/api/auth/token", {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return unwrapApiResponse<AuthTokenResponse>(data);
}

/** Validates stored credentials with the API and returns the user when still authorized. */
export async function resumeAdminSession(): Promise<User | null> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();

  if (!accessToken && !refreshToken) {
    return null;
  }

  if (accessToken) {
    try {
      const user = await getCurrentUser();
      if (!user.roles.includes("admin")) {
        clearAuthSession();
        return null;
      }

      updateStoredUser(user);
      return user;
    } catch {
      // Access token expired or invalid — try refresh below.
    }
  }

  if (refreshToken) {
    try {
      const session = await refreshSession(refreshToken);
      if (!session.user.roles.includes("admin")) {
        clearAuthSession();
        return null;
      }

      updateAuthSession(session);
      return session.user;
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
