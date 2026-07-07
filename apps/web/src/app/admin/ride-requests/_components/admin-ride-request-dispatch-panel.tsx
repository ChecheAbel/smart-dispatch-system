"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, Truck, UserRound } from "lucide-react";
import type { AdminRideRequest, Vehicle } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminPrimaryButtonClass } from "@/lib/admin-theme";
import { fetchAssignableVehiclesForRideRequest } from "@/lib/admin-ride-request-api";
import type { SupportedLocale } from "@/lib/locale";
import { formatScheduledAt } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import { formatMessage, getAdminRideRequestsMessages } from "@/translations";
import { cn } from "@/lib/utils";

type AdminRideRequestDispatchPanelProps = {
  request: AdminRideRequest;
  locale: SupportedLocale;
  canWrite: boolean;
  submitting: "assign" | "unassign" | null;
  onAssign: (vehicleId: string) => Promise<void>;
  onUnassign: () => Promise<void>;
};

function formatVehicleName(vehicle: Pick<Vehicle, "make" | "model">) {
  return [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—";
}

export function AdminRideRequestDispatchPanel({
  request,
  locale,
  canWrite,
  submitting,
  onAssign,
  onUnassign,
}: AdminRideRequestDispatchPanelProps) {
  const copy = getAdminRideRequestsMessages(locale);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const showAssignmentControls =
    canWrite && (request.can_admin_assign || request.can_admin_unassign);

  useEffect(() => {
    if (!showAssignmentControls || !request.can_admin_assign) {
      setVehicles([]);
      return;
    }

    let isStale = false;

    async function loadVehicles() {
      setLoadingVehicles(true);

      try {
        const loaded = await fetchAssignableVehiclesForRideRequest(request.id, { locale });
        if (!isStale) {
          setVehicles(loaded);
        }
      } catch {
        if (!isStale) {
          setVehicles([]);
        }
      } finally {
        if (!isStale) {
          setLoadingVehicles(false);
        }
      }
    }

    void loadVehicles();

    return () => {
      isStale = true;
    };
  }, [locale, request.can_admin_assign, request.id, showAssignmentControls]);

  useEffect(() => {
    if (request.assigned_vehicle_id) {
      setSelectedVehicleId(request.assigned_vehicle_id);
      return;
    }

    setSelectedVehicleId((current) => current ?? vehicles[0]?.id ?? null);
  }, [request.assigned_vehicle_id, vehicles]);

  const filteredVehicles = useMemo(() => {
    const query = vehicleSearch.trim().toLowerCase();
    if (!query) {
      return vehicles;
    }

    return vehicles.filter((vehicle) => {
      const haystack = [
        vehicle.plate_number,
        vehicle.make,
        vehicle.model,
        vehicle.vehicle_type?.name,
        vehicle.vehicle_class?.name,
        vehicle.assigned_driver?.name,
        vehicle.assigned_driver?.email,
        vehicle.assigned_driver?.mobile_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [vehicleSearch, vehicles]);

  const isSelectedVehicleAlreadyAssigned = Boolean(
    selectedVehicleId && request.assigned_vehicle_id === selectedVehicleId,
  );

  if (!request.assigned_vehicle && !showAssignmentControls) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[#1C3A34]/8 text-[#1C3A34]">
          <Truck className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1C3A34]">{copy.dispatch.section}</h3>
          <p className="text-xs text-slate-500">{copy.dispatch.sectionDescription}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        {request.assigned_vehicle ? (
          <div className="border-b border-[#1C3A34]/10 bg-gradient-to-r from-[#1C3A34]/6 to-[#C9B87A]/10 px-4 py-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Badge className="border-[#1C3A34]/15 bg-[#1C3A34]/10 text-[11px] font-semibold uppercase tracking-wide text-[#1C3A34]">
                {copy.dispatch.currentlyAssigned}
              </Badge>
              {request.assigned_at ? (
                <span className="text-xs text-slate-500">
                  {new Date(request.assigned_at).toLocaleString(locale)}
                </span>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/80 text-[#1C3A34] shadow-sm">
                  <Truck className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {copy.dispatch.vehicle}
                  </p>
                  <p className="truncate text-sm font-semibold text-[#1C3A34]">
                    {request.assigned_vehicle.plate_number}
                  </p>
                  <p className="truncate text-xs text-slate-600">
                    {formatVehicleName(request.assigned_vehicle)}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/80 text-[#1C3A34] shadow-sm">
                  <UserRound className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {copy.dispatch.driver}
                  </p>
                  <p className="truncate text-sm font-semibold text-[#1C3A34]">
                    {request.assigned_driver?.name ?? "—"}
                  </p>
                  <p className="truncate text-xs text-slate-600">
                    {request.assigned_driver?.mobile_number ??
                      request.assigned_driver?.email ??
                      "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-b border-amber-200/80 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
            {copy.dispatch.unassigned}
          </div>
        )}

        {request.start_blocked_by_schedule && request.scheduled_at ? (
          <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {formatMessage(copy.dispatch.startTripScheduleBlocked, {
              time: formatScheduledAt(request.scheduled_at, locale),
            })}
          </div>
        ) : null}

        {request.started_at || request.completed_at ? (
          <div className="flex flex-wrap gap-2 border-b border-slate-200/80 px-4 py-3">
            {request.started_at ? (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                {copy.dispatch.startedAt}: {new Date(request.started_at).toLocaleString(locale)}
              </span>
            ) : null}
            {request.completed_at ? (
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800">
                {copy.dispatch.completedAt}: {new Date(request.completed_at).toLocaleString(locale)}
              </span>
            ) : null}
          </div>
        ) : null}

        {showAssignmentControls && request.can_admin_assign ? (
          <div className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">{copy.dispatch.availableVehicles}</p>
              <span className="text-xs text-slate-400">
                {filteredVehicles.length}/{vehicles.length}
              </span>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={vehicleSearch}
                onChange={(event) => setVehicleSearch(event.target.value)}
                placeholder={copy.dispatch.searchVehicles}
                className="h-10 border-slate-200 bg-slate-50/60 pl-9"
              />
            </div>

            {loadingVehicles ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 py-8 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" />
                {copy.dispatch.loadingVehicles}
              </div>
            ) : filteredVehicles.length > 0 ? (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {filteredVehicles.map((vehicle) => {
                  const isSelected = selectedVehicleId === vehicle.id;
                  const isAssigned = request.assigned_vehicle_id === vehicle.id;

                  return (
                    <button
                      key={vehicle.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(vehicle.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition",
                        isSelected
                          ? "border-[#1C3A34] bg-[#1C3A34]/5 ring-1 ring-[#1C3A34]/15"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border",
                          isSelected
                            ? "border-[#1C3A34] bg-[#1C3A34] text-white"
                            : "border-slate-300 bg-white",
                        )}
                      >
                        {isSelected ? <Check className="size-3" /> : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#1C3A34]">
                            {vehicle.plate_number}
                          </p>
                          {isAssigned ? (
                            <Badge
                              variant="outline"
                              className="border-[#1C3A34]/20 bg-[#1C3A34]/5 text-[10px] text-[#1C3A34]"
                            >
                              {copy.dispatch.assignedBadge}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-600">{formatVehicleName(vehicle)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {vehicle.assigned_driver?.name ?? copy.dispatch.noDriver}
                          {vehicle.vehicle_type?.name ? ` · ${vehicle.vehicle_type.name}` : ""}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                {vehicles.length > 0 ? copy.dispatch.noSearchResults : copy.dispatch.noVehicles}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/80 pt-4">
              {selectedVehicleId ? (
                <Button
                  type="button"
                  size="sm"
                  className={cn("h-10 px-4", adminPrimaryButtonClass)}
                  disabled={Boolean(submitting) || isSelectedVehicleAlreadyAssigned}
                  onClick={() => void onAssign(selectedVehicleId)}
                >
                  {submitting === "assign" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      {copy.dispatch.assigning}
                    </>
                  ) : (
                    copy.dispatch.assign
                  )}
                </Button>
              ) : null}
              {request.can_admin_unassign ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-10 border-slate-300 bg-slate-100 px-4 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                  disabled={Boolean(submitting)}
                  onClick={() => void onUnassign()}
                >
                  {submitting === "unassign" ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      {copy.dispatch.unassigning}
                    </>
                  ) : (
                    copy.dispatch.unassign
                  )}
                </Button>
              ) : null}
            </div>
          </div>
        ) : showAssignmentControls && request.can_admin_unassign ? (
          <div className="flex justify-end border-t border-slate-200/80 p-4">
            <Button
              type="button"
              size="sm"
              className="h-10 border-slate-300 bg-slate-100 px-4 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
              disabled={Boolean(submitting)}
              onClick={() => void onUnassign()}
            >
              {submitting === "unassign" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  {copy.dispatch.unassigning}
                </>
              ) : (
                copy.dispatch.unassign
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
