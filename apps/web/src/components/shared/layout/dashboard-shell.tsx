"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthMeResponse } from "@smart-dispatch/types";
import { DashboardFooter } from "@/components/shared/layout/dashboard-footer";
import { DashboardHeader } from "@/components/shared/layout/dashboard-header";
import { DashboardSidebar } from "@/components/shared/layout/dashboard-sidebar";
import { RouteGuard } from "@/components/shared/layout/route-guard";
import { AuthProvider } from "@/components/shared/providers/auth-context";
import { LocaleProvider } from "@/components/shared/providers/locale-context";
import { NavigationProvider } from "@/components/shared/providers/navigation-context";
import { ADMIN_SIGN_IN_PATH } from "@/lib/auth-paths";
import { clearAuthSession } from "@/lib/auth-session";
import { resumeAdminSession } from "@/lib/auth-api";
import { adminTheme } from "@/lib/admin-theme";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

function DashboardLoadingShell() {
  return (
    <div className="admin-theme flex min-h-svh" style={{ backgroundColor: adminTheme.surface }}>
      <div
        className="hidden w-64 border-r border-white/10 p-4 md:block"
        style={{ backgroundColor: adminTheme.brand }}
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

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AuthMeResponse | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("admin-theme");
    return () => document.documentElement.classList.remove("admin-theme");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const nextSession = await resumeAdminSession();

      if (cancelled) return;

      if (!nextSession) {
        router.replace(ADMIN_SIGN_IN_PATH);
        return;
      }

      setSession(nextSession);
      setReady(true);
    }

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function signOut() {
    clearAuthSession();
    router.replace(ADMIN_SIGN_IN_PATH);
  }

  if (!ready || !session) {
    return <DashboardLoadingShell />;
  }

  return (
    <AuthProvider
      user={session.user}
      permissions={session.permissions}
      signOut={signOut}
    >
      <LocaleProvider>
        <NavigationProvider>
          <TooltipProvider>
            <SidebarProvider className="admin-theme bg-[#f8fafb]">
              <DashboardSidebar />
              <SidebarInset className="flex min-h-svh flex-col bg-[#f8fafb]">
                <DashboardHeader />
                <main className="flex-1 overflow-auto p-4 sm:p-6">
                  <RouteGuard>{children}</RouteGuard>
                </main>
                <DashboardFooter />
              </SidebarInset>
            </SidebarProvider>
            <Toaster />
          </TooltipProvider>
        </NavigationProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
