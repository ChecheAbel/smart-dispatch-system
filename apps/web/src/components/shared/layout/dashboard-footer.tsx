"use client";

import Link from "next/link";
import { useBranding, useLocale } from "@/components/shared/providers";
import { usePortalShell } from "@/components/shared/providers/portal-shell-context";
import { Separator } from "@/components/ui/separator";
import { formatMessage } from "@/translations";

const APP_VERSION = "1.0.0";

export function DashboardFooter() {
  const { locale } = useLocale();
  const { branding } = useBranding();
  const { getShellMessages, homePath } = usePortalShell();
  const copy = getShellMessages(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white">
      <div className="flex flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="space-y-1">
          <p className="font-medium text-[var(--brand-primary)]">
            © {year} {branding.company_name}
          </p>
          <p>{branding.product_name}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={homePath}
            className="font-medium transition-colors hover:text-[var(--brand-accent)]"
            style={{ color: "var(--brand-primary)" }}
          >
            {copy.footer.backToWebsite}
          </Link>
          <Separator orientation="vertical" className="hidden h-4 sm:block" />
          <span>{formatMessage(copy.footer.version, { version: APP_VERSION })}</span>
        </div>
      </div>
    </footer>
  );
}
