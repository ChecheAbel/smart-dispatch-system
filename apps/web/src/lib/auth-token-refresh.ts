import axios from "axios";
import type { AuthTokenResponse } from "@smart-dispatch/types";
import { unwrapApiResponse } from "./api-response";
import { clearAuthSession, getRefreshToken, updateAuthSession } from "./auth-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

let refreshPromise: Promise<AuthTokenResponse | null> | null = null;

export async function performTokenRefresh(
  refreshToken = getRefreshToken(),
): Promise<AuthTokenResponse | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!refreshToken) {
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const { data } = await axios.post(
        `${API_URL}/api/auth/token`,
        {
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        },
        { headers: { "Content-Type": "application/json" } },
      );

      const response = unwrapApiResponse<AuthTokenResponse>(data);
      updateAuthSession(response);
      return response;
    } catch {
      clearAuthSession();
      return null;
    }
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}
