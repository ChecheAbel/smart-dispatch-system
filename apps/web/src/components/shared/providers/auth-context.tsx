"use client";

import { createContext, useContext } from "react";
import type { User } from "@smart-dispatch/types";

type AuthContextValue = {
  user: User;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  user,
  signOut,
  children,
}: AuthContextValue & { children: React.ReactNode }) {
  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}

export function getUserInitials(user: User) {
  const first = user.first_name?.trim().charAt(0) ?? "";
  const last = user.last_name?.trim().charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "AD";
}
