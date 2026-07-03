"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Lock, ShieldAlert } from "lucide-react";
import { useNavigation } from "@/components/shared/providers/navigation-context";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth-paths";
import { getDefaultAllowedPath, isPathAllowed } from "@/lib/admin-navigation";
import { adminBadgeGoldClass, adminCardClass, adminHeadingClass } from "@/lib/admin-theme";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function RouteLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function AccessDenied({ fallbackPath }: { fallbackPath: string | null }) {
  return (
    <Card className={`${adminCardClass} max-w-xl`}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-red-50 p-3 text-red-600">
            <ShieldAlert className="size-5" />
          </div>
          <div className="space-y-1">
            <Badge className={adminBadgeGoldClass}>Access denied</Badge>
            <CardTitle className={adminHeadingClass}>You do not have permission</CardTitle>
            <CardDescription className="text-slate-500">
              This page is not available for your account. Contact an administrator if you
              believe this is a mistake.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        {fallbackPath ? (
          <Link
            href={fallbackPath}
            className={buttonVariants({
              className: "bg-[#1C3A34] text-white hover:bg-[#162e29]",
            })}
          >
            Go to allowed page
          </Link>
        ) : null}
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Lock className="size-3.5" />
          Access is controlled by your role permissions.
        </p>
      </CardContent>
    </Card>
  );
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { menus, loading, error } = useNavigation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const allowed = isPathAllowed(pathname, menus);
  const fallbackPath = getDefaultAllowedPath(menus);

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
    return <AccessDenied fallbackPath={ADMIN_DASHBOARD_PATH} />;
  }

  if (!allowed) {
    return <AccessDenied fallbackPath={fallbackPath} />;
  }

  return <>{children}</>;
}
