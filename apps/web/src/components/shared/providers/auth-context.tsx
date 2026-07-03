"use client";

import { createContext, useContext, useMemo } from "react";
import type { Permission, User } from "@smart-dispatch/types";
import { createPermissionChecker } from "@/lib/permissions";

type AuthContextValue = {
  user: User;
  permissions: Permission[];
  hasPermission: (slug: string) => boolean;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  user,
  permissions,
  signOut,
  children,
}: {
  user: User;
  permissions: Permission[];
  signOut: () => void;
  children: React.ReactNode;
}) {
  const hasPermission = useMemo(() => createPermissionChecker(permissions), [permissions]);

  return (
    <AuthContext.Provider value={{ user, permissions, hasPermission, signOut }}>
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
