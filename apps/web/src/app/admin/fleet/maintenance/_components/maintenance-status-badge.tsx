import type { VehicleMaintenanceStatus } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MaintenanceStatusBadgeProps = {
  status: VehicleMaintenanceStatus;
  label: string;
};

export function MaintenanceStatusBadge({ status, label }: MaintenanceStatusBadgeProps) {
  let badgeClass = "border-slate-200 bg-slate-50 text-slate-700 dark:border-border dark:bg-muted dark:text-muted-foreground";
  let dotClass = "bg-slate-400";

  switch (status) {
    case "open":
      badgeClass = "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/35 dark:bg-sky-500/12 dark:text-sky-300";
      dotClass = "bg-sky-500";
      break;
    case "in_progress":
      badgeClass = "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/35 dark:bg-amber-400/12 dark:text-amber-300";
      dotClass = "bg-amber-500";
      break;
    case "completed":
      badgeClass = "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-500/12 dark:text-emerald-300";
      dotClass = "bg-emerald-500";
      break;
    case "cancelled":
      badgeClass = "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-300";
      dotClass = "bg-slate-400";
      break;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeClass,
      )}
    >
      <span className={cn("size-1.5 rounded-full", dotClass)} />
      {label}
    </Badge>
  );
}
