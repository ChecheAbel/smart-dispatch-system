"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import type { AuthMeResponse } from "@smart-dispatch/types";
import { DashboardFooter } from "@/components/shared/layout/dashboard-footer";
import { DashboardHeader } from "@/components/shared/layout/dashboard-header";
import { DashboardSidebar } from "@/components/shared/layout/dashboard-sidebar";
import { RouteGuard } from "@/components/shared/layout/route-guard";
import { AuthProvider } from "@/components/shared/providers/auth-context";
import { LocaleProvider } from "@/components/shared/providers/locale-context";
import { NavigationProvider } from "@/components/shared/providers/navigation-context";
import { PortalShellProvider } from "@/components/shared/providers/portal-shell-context";
import { clearAuthSession } from "@/lib/auth-session";
import { adminTheme } from "@/lib/admin-theme";
import type { NavigationPortal } from "@/lib/portal-navigation";
import { PORTAL_SHELL_CONFIG } from "@/lib/portal-shell-config";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

function ShellLoadingState() {
  return (
    <div className="admin-theme flex min-h-svh" style={{ backgroundColor: adminTheme.surface }}>
      <div
        className="hidden border-r border-white/10 p-4 md:block"
        style={{ width: adminTheme.sidebarWidth, backgroundColor: adminTheme.brand }}
      >
        <Skeleton className="h-8 w-40 bg-white/15" />
        <div className="mt-8 space-y-3">
          <Skeleton className="h-9 w-full bg-white/10" />
          <Skeleton className="h-9 w-full bg-white/10" />
          <Skeleton className="h-9 w-full bg-white/10" />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <Skeleton className="h-16 w-full rounded-none" />
        <div className="flex-1 space-y-4 p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

export function DashboardShell({
  portal = "admin",
  children,
}: {
  portal?: NavigationPortal;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<AuthMeResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("admin-theme");
    return () => document.documentElement.classList.remove("admin-theme");
  }, []);

  useEffect(() => {
    let cancelled = false;
    const { resumeSession, signInPath } = PORTAL_SHELL_CONFIG[portal];

    async function verifySession() {
      const nextSession = await resumeSession();

      if (cancelled) return;

      if (!nextSession) {
        clearAuthSession();
        router.replace(signInPath);
        return;
      }

      setSession(nextSession);
      setReady(true);
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [portal, router]);

  function signOut() {
    clearAuthSession();
    router.replace(PORTAL_SHELL_CONFIG[portal].signInPath);
  }

  if (!ready || !session) {
    return <ShellLoadingState />;
  }

  return (
    <AuthProvider
      user={session.user}
      permissions={session.permissions}
      signOut={signOut}
    >
      <LocaleProvider>
        <PortalShellProvider portal={portal}>
          <NavigationProvider portal={portal}>
            <TooltipProvider>
              <SidebarProvider
                className="admin-theme bg-[#f8fafb]"
                style={{ "--sidebar-width": adminTheme.sidebarWidth } as CSSProperties}
              >
                <DashboardSidebar />
                <SidebarInset className="flex min-h-svh min-w-0 flex-col bg-[#f8fafb]">
                  <DashboardHeader />
                  <main className="min-w-0 flex-1 overflow-auto p-4 sm:p-6">
                    <RouteGuard portal={portal}>{children}</RouteGuard>
                  </main>
                  <DashboardFooter />
                </SidebarInset>
              </SidebarProvider>
              <Toaster />
            </TooltipProvider>
          </NavigationProvider>
        </PortalShellProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
