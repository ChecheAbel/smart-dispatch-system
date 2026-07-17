import type { AuthMeResponse, AuthTokenResponse, Permission, User } from "@smart-dispatch/types";

const ACCESS_TOKEN_KEY = "sds_access_token";
const REFRESH_TOKEN_KEY = "sds_refresh_token";
const USER_KEY = "sds_user";
const PERMISSIONS_KEY = "sds_permissions";

function getStorage(persistent: boolean) {
  if (typeof window === "undefined") return null;
  return persistent ? window.localStorage : window.sessionStorage;
}

function clearStorage(storage: Storage) {
  storage.removeItem(ACCESS_TOKEN_KEY);
  storage.removeItem(REFRESH_TOKEN_KEY);
  storage.removeItem(USER_KEY);
  storage.removeItem(PERMISSIONS_KEY);
}

export function saveAuthSession(response: AuthTokenResponse, remember: boolean) {
  const storage = getStorage(remember);
  const alternate = getStorage(!remember);
  if (!storage) return;

  if (alternate) clearStorage(alternate);
  clearStorage(storage);

  storage.setItem(ACCESS_TOKEN_KEY, response.access_token);
  storage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
  storage.setItem(USER_KEY, JSON.stringify(response.user));
  storage.setItem(PERMISSIONS_KEY, JSON.stringify(response.permissions ?? []));
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return (
    window.sessionStorage.getItem(ACCESS_TOKEN_KEY) ??
    window.localStorage.getItem(ACCESS_TOKEN_KEY)
  );
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return (
    window.sessionStorage.getItem(REFRESH_TOKEN_KEY) ??
    window.localStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;

  const raw =
    window.sessionStorage.getItem(USER_KEY) ?? window.localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getStoredPermissions(): Permission[] {
  if (typeof window === "undefined") return [];

  const raw =
    window.sessionStorage.getItem(PERMISSIONS_KEY) ??
    window.localStorage.getItem(PERMISSIONS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as Permission[];
  } catch {
    return [];
  }
}

function getActiveStorage() {
  if (typeof window === "undefined") return null;
  if (window.localStorage.getItem(ACCESS_TOKEN_KEY)) return window.localStorage;
  if (window.sessionStorage.getItem(ACCESS_TOKEN_KEY)) return window.sessionStorage;
  return null;
}

export function hasPersistentSession() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY) !== null;
}

export function updateStoredSession(session: AuthMeResponse) {
  const storage = getActiveStorage();
  if (!storage) return;
  storage.setItem(USER_KEY, JSON.stringify(session.user));
  storage.setItem(PERMISSIONS_KEY, JSON.stringify(session.permissions));
}

export function updateStoredUser(user: User) {
  const storage = getActiveStorage();
  if (!storage) return;
  storage.setItem(USER_KEY, JSON.stringify(user));
}

export function updateAuthSession(response: AuthTokenResponse) {
  saveAuthSession(response, hasPersistentSession());
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  clearStorage(window.sessionStorage);
  clearStorage(window.localStorage);
}

const ADMIN_SIGN_IN_PREFS_KEY = "sds_admin_sign_in_prefs";

export type AdminSignInPrefs = {
  login_method: "email" | "mobile";
  username: string;
};

export function getAdminSignInPrefs(): AdminSignInPrefs | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(ADMIN_SIGN_IN_PREFS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AdminSignInPrefs>;
    if (
      (parsed.login_method !== "email" && parsed.login_method !== "mobile") ||
      typeof parsed.username !== "string" ||
      !parsed.username.trim()
    ) {
      return null;
    }

    return {
      login_method: parsed.login_method,
      username: parsed.username.trim(),
    };
  } catch {
    return null;
  }
}

export function saveAdminSignInPrefs(prefs: AdminSignInPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_SIGN_IN_PREFS_KEY, JSON.stringify(prefs));
}

export function clearAdminSignInPrefs() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_SIGN_IN_PREFS_KEY);
}
