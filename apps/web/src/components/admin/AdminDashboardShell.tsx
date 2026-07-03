"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@smart-dispatch/types";
import AdminFooter from "@/components/admin/AdminFooter";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { AdminAuthProvider } from "@/components/admin/admin-auth-context";
import { AdminLocaleProvider } from "@/components/admin/admin-locale-context";
import { AdminNavigationProvider } from "@/components/admin/admin-navigation-context";
import { ADMIN_SIGN_IN_PATH } from "@/lib/auth-paths";
import { clearAuthSession } from "@/lib/auth-session";
import { resumeAdminSession } from "@/lib/auth-api";
import { adminTheme } from "@/lib/admin-theme";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";

function AdminLoadingShell() {
  return (
    <div className="admin-theme flex min-h-svh" style={{ backgroundColor: adminTheme.surface }}>
      <div className="hidden w-64 border-r border-white/10 p-4 md:block" style={{ backgroundColor: adminTheme.brand }}>
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

export default function AdminDashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add("admin-theme");
    return () => document.documentElement.classList.remove("admin-theme");
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      const user = await resumeAdminSession();

      if (cancelled) return;

      if (!user) {
        router.replace(ADMIN_SIGN_IN_PATH);
        return;
      }

      setUser(user);
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

  if (!ready || !user) {
    return <AdminLoadingShell />;
  }

  return (
    <AdminAuthProvider user={user} signOut={signOut}>
      <AdminLocaleProvider>
        <AdminNavigationProvider>
          <TooltipProvider>
            <SidebarProvider className="admin-theme bg-[#f8fafb]">
              <AdminSidebar />
              <SidebarInset className="flex min-h-svh flex-col bg-[#f8fafb]">
                <AdminHeader />
                <main className="flex-1 overflow-auto p-4 sm:p-6">
                  <AdminRouteGuard>{children}</AdminRouteGuard>
                </main>
                <AdminFooter />
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
        </AdminNavigationProvider>
      </AdminLocaleProvider>
    </AdminAuthProvider>
  );
}
