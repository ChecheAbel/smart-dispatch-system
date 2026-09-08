import type { AccountStatus } from "@smart-dispatch/types";
import { cn } from "@/lib/utils";
import { DRIVER_STATUS_CONFIG } from "./driver-helpers";

export function DriverStatusBadge({
  status,
  label,
  className,
}: {
  status: AccountStatus;
  label: string;
  className?: string;
}) {
  const config = DRIVER_STATUS_CONFIG[status] ?? DRIVER_STATUS_CONFIG.deactivated;

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
