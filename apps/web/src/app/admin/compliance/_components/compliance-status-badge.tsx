import type { VehicleComplianceStatus } from "@smart-dispatch/types";
import { cn } from "@/lib/utils";

export const COMPLIANCE_STATUS_CONFIG: Record<
  VehicleComplianceStatus,
  {
    dotClass: string;
    badgeClass: string;
    cardBorderClass: string;
    cardBgClass: string;
    textClass: string;
    pulse?: boolean;
  }
> = {
  ok: {
    dotClass: "bg-emerald-500",
    badgeClass:
      "border-emerald-200/90 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    cardBorderClass: "border-emerald-200/80 hover:border-emerald-300 dark:border-emerald-500/25",
    cardBgClass: "bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10",
    textClass: "text-emerald-800 dark:text-emerald-300",
  },
  due_soon: {
    dotClass: "bg-amber-500",
    badgeClass:
      "border-amber-200/90 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    cardBorderClass: "border-amber-200/80 hover:border-amber-300 dark:border-amber-500/25",
    cardBgClass: "bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-500/5 dark:hover:bg-amber-500/10",
    textClass: "text-amber-800 dark:text-amber-300",
  },
  expired: {
    dotClass: "bg-red-500",
    badgeClass:
      "border-red-200/90 bg-red-50/80 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
    cardBorderClass: "border-red-200/80 hover:border-red-300 dark:border-red-500/25",
    cardBgClass: "bg-red-50/40 hover:bg-red-50/70 dark:bg-red-500/5 dark:hover:bg-red-500/10",
    textClass: "text-red-800 dark:text-red-300",
    pulse: true,
  },
  not_set: {
    dotClass: "bg-slate-400",
    badgeClass:
      "border-slate-200/90 bg-slate-50/80 text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
    cardBorderClass: "border-slate-200/80 hover:border-slate-300 dark:border-border",
    cardBgClass: "bg-slate-50/50 hover:bg-slate-50/90 dark:bg-muted/30 dark:hover:bg-muted/50",
    textClass: "text-slate-700 dark:text-muted-foreground",
  },
};

export function ComplianceStatusBadge({
  status,
  label,
  className,
}: {
  status: VehicleComplianceStatus;
  label: string;
  className?: string;
}) {
  const config = COMPLIANCE_STATUS_CONFIG[status] ?? COMPLIANCE_STATUS_CONFIG.not_set;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        config.badgeClass,
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          config.dotClass,
          config.pulse && "animate-pulse",
        )}
      />
      {label}
    </span>
  );
}
