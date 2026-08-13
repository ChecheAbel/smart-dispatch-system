"use client";

import Link from "next/link";
import { useBranding, useLocale } from "@/components/shared/providers";
import { usePortalShell } from "@/components/shared/providers/portal-shell-context";
import { formatMessage } from "@/translations";

const APP_VERSION = "1.0.0";

export function DashboardFooter() {
  const { locale } = useLocale();
  const { branding } = useBranding();
  const { getShellMessages, homePath } = usePortalShell();
  const copy = getShellMessages(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white dark:border-border dark:bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-4 text-xs text-slate-500 dark:text-muted-foreground sm:px-6">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="break-words font-medium text-[var(--brand-primary)] dark:text-foreground">
            © {year} {branding.company_name}
          </p>
          <p className="break-words">{branding.product_name}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <Link
            href={homePath}
            className="inline-flex min-h-9 items-center justify-center rounded-md font-medium text-[var(--brand-primary)] transition-colors hover:text-[var(--brand-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2 dark:text-[var(--brand-accent)] sm:min-h-0"
          >
            {copy.footer.backToWebsite}
          </Link>
          <span className="whitespace-nowrap">
            {formatMessage(copy.footer.version, { version: APP_VERSION })}
          </span>
        </div>
      </div>
    </footer>
  );
}
