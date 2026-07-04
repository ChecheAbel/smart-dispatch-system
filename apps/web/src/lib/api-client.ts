import axios, { type InternalAxiosRequestConfig } from "axios";
import { ADMIN_SIGN_IN_PATH } from "./auth-paths";
import { performTokenRefresh } from "./auth-token-refresh";
import { clearAuthSession, getAccessToken } from "./auth-session";
import { getStoredLocale } from "./locale";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

function isAuthRequest(url?: string) {
  if (!url) return false;

  return (
    url.includes("/api/auth/login") ||
    url.includes("/api/auth/token") ||
    url.includes("/api/auth/register-driver") ||
    url.includes("/api/auth/forgot-password") ||
    url.includes("/api/auth/reset-password")
  );
}

function redirectToSignInIfNeeded() {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  if (path.startsWith("/admin") || path === ADMIN_SIGN_IN_PATH) {
    window.location.assign(ADMIN_SIGN_IN_PATH);
  }
}

function rejectWithApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message =
      typeof error.response?.data?.error === "string"
        ? error.response.data.error
        : "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  }

  return Promise.reject(
    error instanceof Error ? error : new Error("Something went wrong. Please try again."),
  );
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers["Accept-Language"] = getStoredLocale();
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return rejectWithApiError(error);
    }

    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const shouldRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRequest(originalRequest.url);

    if (shouldRefresh) {
      originalRequest._retry = true;

      const refreshed = await performTokenRefresh();
      if (refreshed?.access_token) {
        originalRequest.headers.Authorization = `Bearer ${refreshed.access_token}`;
        return apiClient(originalRequest);
      }

      clearAuthSession();
      redirectToSignInIfNeeded();
    }

    return rejectWithApiError(error);
  },
);
