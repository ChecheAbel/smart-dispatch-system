"use client";

import { createContext, useContext } from "react";
import type { PortalShellConfig } from "@/lib/portal-shell-config";
import type { NavigationPortal } from "@/lib/portal-navigation";
import { PORTAL_SHELL_CONFIG } from "@/lib/portal-shell-config";

const PortalShellContext = createContext<PortalShellConfig | null>(null);

export function PortalShellProvider({
  portal,
  children,
}: {
  portal: NavigationPortal;
  children: React.ReactNode;
}) {
  return (
    <PortalShellContext.Provider value={PORTAL_SHELL_CONFIG[portal]}>
      {children}
    </PortalShellContext.Provider>
  );
}

export function usePortalShell() {
  const context = useContext(PortalShellContext);
  if (!context) {
    throw new Error("usePortalShell must be used within PortalShellProvider.");
  }
  return context;
}
