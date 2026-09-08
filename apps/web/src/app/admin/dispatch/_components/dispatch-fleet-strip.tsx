"use client";

import { Truck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { adminCardClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";
import { SectionHeader, type OverviewCopy } from "./dispatch-overview-types";

interface FleetStripProps {
  copy: OverviewCopy;
  fleet: { dispatchable: number; available: number; busy: number };
  loading: boolean;
}

export function FleetStrip({ copy, fleet, loading }: FleetStripProps) {
  const availabilityPercent =
    fleet.dispatchable > 0 ? Math.round((fleet.available / fleet.dispatchable) * 100) : 0;

  return (
    <section
      id="dispatch-fleet"
      className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24 shadow-sm")}
    >
      <SectionHeader
        icon={Truck}
        title={copy.fleet.title}
        description={copy.fleet.description}
        href="/admin/fleet/vehicles"
        viewAll={copy.fleet.viewVehicles}
      />
      <div className="grid grid-cols-3 divide-x divide-slate-200/80 dark:divide-border">
        {[
          {
            label: copy.fleet.dispatchable,
            value: fleet.dispatchable,
            className: "text-slate-800 dark:text-foreground",
            hint: "Total active fleet",
          },
          {
            label: copy.fleet.available,
            value: fleet.available,
            className: "text-emerald-700 dark:text-emerald-400",
            hint: `${availabilityPercent}% ready`,
          },
          {
            label: copy.fleet.busy,
            value: fleet.busy,
            className: "text-amber-700 dark:text-amber-400",
            hint: "On assignment",
          },
        ].map((tile) => (
          <div key={tile.label} className="px-4 py-4 text-center sm:px-5">
            <p className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-muted-foreground">
              {tile.label}
            </p>
            {loading ? (
              <Skeleton className="mx-auto mt-2 h-7 w-12" />
            ) : (
              <>
                <p className={cn("mt-1 text-2xl font-bold tabular-nums tracking-tight", tile.className)}>
                  {tile.value}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400 dark:text-muted-foreground">
                  {tile.hint}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
