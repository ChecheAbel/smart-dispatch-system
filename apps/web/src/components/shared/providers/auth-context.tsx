"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Permission, User } from "@smart-dispatch/types";
import { updateStoredSession, updateStoredUser } from "@/lib/auth-session";
import { getCurrentSession } from "@/lib/auth-api";
import { createPermissionChecker } from "@/lib/permissions";

type AuthContextValue = {
  user: User;
  permissions: Permission[];
  hasPermission: (slug: string) => boolean;
  updateUser: (user: User) => void;
  refreshSession: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  user: initialUser,
  permissions: initialPermissions,
  signOut,
  children,
}: {
  user: User;
  permissions: Permission[];
  signOut: () => void;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState(initialUser);
  const [permissions, setPermissions] = useState(initialPermissions);

  useEffect(() => {
    setUser(initialUser);
    setPermissions(initialPermissions);
  }, [initialPermissions, initialUser]);

  const hasPermission = useMemo(() => createPermissionChecker(permissions), [permissions]);

  const updateUser = useCallback((nextUser: User) => {
    setUser(nextUser);
    updateStoredUser(nextUser);
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await getCurrentSession();
    setUser(session.user);
    setPermissions(session.permissions);
    updateStoredSession(session);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, permissions, hasPermission, updateUser, refreshSession, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}

export function usePermission(slug: string) {
  const { hasPermission } = useAuth();
  return hasPermission(slug);
}

export function getUserInitials(user: User) {
  const first = user.first_name?.trim().charAt(0) ?? "";
  const last = user.last_name?.trim().charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "AD";
}
