"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNavigation } from "@/components/shared/providers/navigation-context";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import {
  getCustomerDefaultAllowedPath,
  isCustomerPathAllowed,
} from "@/lib/customer-navigation";
import {
  getDefaultAllowedPath,
  isPathAllowed,
} from "@/lib/admin-navigation";
import { ADMIN_DASHBOARD_PATH, USER_DASHBOARD_PATH } from "@/lib/auth-paths";
import type { NavigationPortal } from "@/lib/portal-navigation";
import { Skeleton } from "@/components/ui/skeleton";

const ROUTE_ACCESS_DENIED_COPY = {
  eyebrow: "Access denied",
  title: "You do not have permission",
  description:
    "This page is not available for your account. Contact an administrator if you believe this is a mistake.",
  sessionHint: "If permissions were changed recently, sign out and sign in again to refresh your session.",
  permissionNote: "Access is controlled by your role permissions.",
  goToDashboard: "Go to allowed page",
};

function RouteLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function RouteGuard({
  children,
  portal = "admin",
}: {
  children: React.ReactNode;
  portal?: NavigationPortal;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { menus, loading, error } = useNavigation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const allowed =
    portal === "customer"
      ? isCustomerPathAllowed(pathname, menus)
      : isPathAllowed(pathname, menus);
  const fallbackPath =
    portal === "customer"
      ? getCustomerDefaultAllowedPath(menus)
      : getDefaultAllowedPath(menus);
  const defaultDashboardPath =
    portal === "customer" ? USER_DASHBOARD_PATH : ADMIN_DASHBOARD_PATH;

  useEffect(() => {
    if (loading) return;

    if (allowed) {
      setIsRedirecting(false);
      return;
    }

    if (fallbackPath && fallbackPath !== pathname) {
      setIsRedirecting(true);
      router.replace(fallbackPath);
      return;
    }

    setIsRedirecting(false);
  }, [allowed, fallbackPath, loading, pathname, router]);

  if (loading || isRedirecting) {
    return <RouteLoading />;
  }

  if (error && !menus.length) {
    return (
      <PageAccessDenied
        copy={{ ...ROUTE_ACCESS_DENIED_COPY, goToDashboard: "Go to dashboard" }}
        fallbackPath={defaultDashboardPath}
      />
    );
  }

  if (!allowed) {
    return (
      <PageAccessDenied
        copy={ROUTE_ACCESS_DENIED_COPY}
        fallbackPath={fallbackPath ?? defaultDashboardPath}
      />
    );
  }

  return <>{children}</>;
}
