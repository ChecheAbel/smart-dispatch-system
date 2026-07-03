"use client";

import { createContext, useContext } from "react";
import type { User } from "@smart-dispatch/types";

type AdminAuthContextValue = {
  user: User;
  signOut: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({
  user,
  signOut,
  children,
}: AdminAuthContextValue & { children: React.ReactNode }) {
  return (
    <AdminAuthContext.Provider value={{ user, signOut }}>{children}</AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider.");
  }
  return context;
}

export function getUserInitials(user: User) {
  const first = user.first_name?.trim().charAt(0) ?? "";
  const last = user.last_name?.trim().charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "AD";
}
