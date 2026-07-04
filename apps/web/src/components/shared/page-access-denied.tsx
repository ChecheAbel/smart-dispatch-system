"use client";

import Link from "next/link";
import { ArrowLeft, Lock, ShieldAlert } from "lucide-react";
import { ADMIN_DASHBOARD_PATH } from "@/lib/auth-paths";
import {
  adminCardClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageAccessDeniedCopy = {
  eyebrow: string;
  title: string;
  description: string;
  sessionHint: string;
  permissionNote: string;
  goToDashboard: string;
};

type PageAccessDeniedProps = {
  copy: PageAccessDeniedCopy;
  fallbackPath?: string;
};

export function PageAccessDenied({
  copy,
  fallbackPath = ADMIN_DASHBOARD_PATH,
}: PageAccessDeniedProps) {
  return (
    <div className="flex min-h-[min(520px,70vh)] items-center justify-center px-4 py-10">
      <div
        className={cn(
          adminCardClass,
          "w-full max-w-xl overflow-hidden rounded-2xl border-slate-200/80 shadow-sm",
        )}
      >
        <div className="border-b border-slate-100 bg-gradient-to-b from-[#f8fafb] to-white px-8 py-10 text-center">
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-red-50 ring-1 ring-red-100">
            <ShieldAlert className="size-8 text-red-600" />
          </div>
          <p className={adminEyebrowClass}>{copy.eyebrow}</p>
          <h2 className={cn("mt-2 text-2xl font-extrabold tracking-tight", adminHeadingClass)}>
            {copy.title}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
            {copy.description}
          </p>
        </div>

        <div className="space-y-4 px-8 py-6">
          <div className="rounded-xl border border-slate-200 bg-[#f8fafb]/80 p-4">
            <div className="flex items-start gap-3">
              <div className={cn(adminIconBoxClass, "shrink-0")}>
                <Lock className="size-4" />
              </div>
              <div className="space-y-1 text-left">
                <p className="text-sm font-semibold text-slate-900">{copy.permissionNote}</p>
                <p className="text-xs leading-relaxed text-slate-500">{copy.sessionHint}</p>
              </div>
            </div>
          </div>

          <Link
            href={fallbackPath}
            className={buttonVariants({
              className: cn(adminPrimaryButtonClass, "inline-flex w-full sm:w-auto"),
            })}
          >
            <ArrowLeft className="size-4" />
            {copy.goToDashboard}
          </Link>
        </div>
      </div>
    </div>
  );
}
