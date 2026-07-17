"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLocale } from "@/components/shared/providers/locale-context";
import { USER_HOME_PATH } from "@/lib/auth-paths";
import { getAdminAuthMessages } from "@/translations";
import { cn } from "@/lib/utils";

type AuthBackToHomeLinkProps = {
  className?: string;
};

export function AuthBackToHomeLink({ className }: AuthBackToHomeLinkProps) {
  const { locale } = useLocale();
  const copy = getAdminAuthMessages(locale);

  return (
    <Link
      href={USER_HOME_PATH}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-[#1C3A34]",
        className,
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {copy.common.backToHome}
    </Link>
  );
}
