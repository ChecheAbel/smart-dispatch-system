"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Radio } from "lucide-react";
import type { AdminDispatchBoard, AdminDispatchBoardVehicle } from "@smart-dispatch/types";
import { Skeleton } from "@/components/ui/skeleton";
import { adminCardClass, adminHeadingClass, adminIconBoxClass } from "@/lib/admin-theme";
import { fetchAdminDispatchBoard } from "@/lib/dispatch-api";
import { getAdminDispatchMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { isVehicleLocationLive } from "@/hooks/use-vehicle-location";
import { useDispatchVehicleLocations } from "@/hooks/use-dispatch-vehicle-locations";
import { DispatchLiveBoardMap } from "./dispatch-live-board-map";

const emptyBoard: AdminDispatchBoard = { trips: [], vehicles: [] };
const BOARD_POLL_MS = 15_000;

type BoardCopy = ReturnType<typeof getAdminDispatchMessages>;

export function DispatchLiveBoard({
  locale,
  copy,
  onReviewTrip,
}: {
  locale: string;
  copy: BoardCopy;
  onReviewTrip?: (tripId: string) => void;
}) {
  const [board, setBoard] = useState<AdminDispatchBoard>(emptyBoard);
  const [loading, setLoading] = useState(true);

  const vehicleIds = useMemo(() => board.vehicles.map((vehicle) => vehicle.id), [board.vehicles]);
  const { locations, connected } = useDispatchVehicleLocations(vehicleIds, !loading);

  const vehicles = useMemo(
    () =>
      board.vehicles.map((vehicle): AdminDispatchBoardVehicle & { live?: boolean } => {
        const live = locations[vehicle.id];
        return {
          ...vehicle,
          live: isVehicleLocationLive(live?.recorded_at ?? vehicle.location?.recorded_at),
          location: live
            ? {
                latitude: live.latitude,
                longitude: live.longitude,
                recorded_at: live.recorded_at,
              }
            : vehicle.location,
        };
      }),
    [board.vehicles, locations],
  );

  const loadBoard = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      setBoard(await fetchAdminDispatchBoard(locale));
    } catch {
      if (!silent) {
        setBoard(emptyBoard);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [locale]);

  useEffect(() => {
    void loadBoard();
    const timer = window.setInterval(() => {
      void loadBoard(true);
    }, BOARD_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadBoard]);

  return (
    <section id="dispatch-live-board" className={cn(adminCardClass, "overflow-hidden rounded-xl scroll-mt-24")}>
      <div className="flex flex-col gap-3 border-b border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-border">
        <div className="flex min-w-0 items-start gap-3">
          <div className={adminIconBoxClass}>
            <Radio className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className={cn("text-base font-semibold", adminHeadingClass)}>{copy.board.title}</h2>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  connected
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/12 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground",
                )}
              >
                {connected ? copy.board.live : copy.board.offline}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-muted-foreground">{copy.board.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
          <LegendDot className="bg-[#1C3A34]" label={copy.board.available} />
          <LegendDot className="bg-slate-400" label={copy.board.busy} />
          <LegendDot className="bg-[#C9B87A]" label={copy.board.unmatchedPickup} />
        </div>
      </div>

      <div className="relative h-[22rem] sm:h-[28rem] lg:h-[34rem]">
        {loading ? (
          <Skeleton className="h-full w-full rounded-none" />
        ) : (
          <DispatchLiveBoardMap
            trips={board.trips}
            vehicles={vehicles}
            fitLabel={copy.board.fitAll}
            onTripClick={onReviewTrip}
          />
        )}
      </div>
    </section>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  );
}
