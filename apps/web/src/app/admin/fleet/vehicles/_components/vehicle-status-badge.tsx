import type { VehicleStatus } from "@smart-dispatch/types";
import { cn } from "@/lib/utils";

export const VEHICLE_STATUS_CONFIG: Record<
  VehicleStatus,
  {
    dotClass: string;
    badgeClass: string;
    pulse?: boolean;
  }
> = {
  active: {
    dotClass: "bg-emerald-500",
    badgeClass:
      "border-emerald-200/90 bg-emerald-50/80 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  maintenance: {
    dotClass: "bg-amber-500",
    badgeClass:
      "border-amber-200/90 bg-amber-50/80 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    pulse: true,
  },
  retired: {
    dotClass: "bg-slate-400",
    badgeClass:
      "border-slate-200/90 bg-slate-50/80 text-slate-600 dark:border-border dark:bg-muted/50 dark:text-muted-foreground",
  },
};

export function VehicleStatusBadge({
  status,
  label,
  className,
}: {
  status: VehicleStatus;
  label: string;
  className?: string;
}) {
  const config = VEHICLE_STATUS_CONFIG[status] ?? VEHICLE_STATUS_CONFIG.retired;

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
