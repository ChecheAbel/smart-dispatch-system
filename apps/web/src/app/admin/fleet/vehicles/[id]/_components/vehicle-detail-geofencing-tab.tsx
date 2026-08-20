"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Circle,
  Clock3,
  Hexagon,
  MapPinned,
  Pencil,
  Plus,
  Ruler,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { GeofenceCoordinate, Vehicle, VehicleGeofence } from "@smart-dispatch/types";
import { useLocale } from "@/components/shared/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import type { GeofenceMapEditorValue } from "@/components/shared/geofence-map-editor";
import { formatGlobalDateTime } from "@/lib/ethiopian-calendar";
import {
  deleteVehicleGeofence,
  fetchVehicleGeofences,
} from "@/lib/vehicle-geofence-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { GeofenceEditorSheet } from "./geofence-editor-sheet";

const LazyGeofenceMapEditor = dynamic(
  () =>
    import("@/components/shared/geofence-map-editor").then((mod) => mod.GeofenceMapEditor),
  { ssr: false },
);

type VehicleDetailGeofencingTabProps = {
  vehicle: Vehicle;
  detail: ReturnType<typeof getAdminVehiclesMessages>["detail"];
  canWrite: boolean;
};

type GeofencingCopy = ReturnType<typeof getAdminVehiclesMessages>["detail"]["geofencing"];

function fenceCoverageLabel(fence: VehicleGeofence, copy: GeofencingCopy) {
  if (fence.shape === "circle") {
    return formatMessage(copy.summary.circle, {
      radius: String(fence.radius_m ?? 0),
    });
  }

  return formatMessage(copy.summary.polygon, {
    count: String(fence.coordinates?.length ?? 0),
  });
}

function fenceCenter(fence: VehicleGeofence): GeofenceCoordinate | null {
  if (fence.center_latitude != null && fence.center_longitude != null) {
    return {
      latitude: fence.center_latitude,
      longitude: fence.center_longitude,
    };
  }

  const points = fence.coordinates ?? [];
  if (points.length === 0) {
    return null;
  }

  const total = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
    }),
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: total.latitude / points.length,
    longitude: total.longitude / points.length,
  };
}

function toMapEditorValue(fence: VehicleGeofence): GeofenceMapEditorValue {
  return {
    center:
      fence.center_latitude != null && fence.center_longitude != null
        ? {
            latitude: fence.center_latitude,
            longitude: fence.center_longitude,
          }
        : null,
    radiusM: fence.radius_m ?? 500,
    coordinates: fence.coordinates ?? [],
  };
}

function DetailField({
  icon: Icon,
  label,
  value,
  mono = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3 dark:border-border dark:bg-white/[0.03]",
        className,
      )}
    >
      <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon className="size-3.5 text-slate-400" />
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-sm font-semibold break-words text-slate-800 dark:text-foreground",
          mono && "font-mono text-[13px] font-medium tracking-tight",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function VehicleDetailGeofencingTab({
  vehicle,
  detail,
  canWrite,
}: VehicleDetailGeofencingTabProps) {
  const copy = detail.geofencing;
  const { locale } = useLocale();
  const [geofence, setGeofence] = useState<VehicleGeofence | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadGeofence = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchVehicleGeofences(vehicle.id);
      setGeofence(next[0] ?? null);
    } catch (error) {
      showErrorToast({
        title: copy.toast.loadFailed.title,
        description:
          error instanceof Error ? error.message : copy.toast.loadFailed.description,
      });
    } finally {
      setLoading(false);
    }
  }, [copy.toast.loadFailed.description, copy.toast.loadFailed.title, vehicle.id]);

  useEffect(() => {
    void loadGeofence();
  }, [loadGeofence]);

  const mapValue = useMemo(
    () => (geofence ? toMapEditorValue(geofence) : null),
    [geofence],
  );

  const center = useMemo(() => (geofence ? fenceCenter(geofence) : null), [geofence]);

  function openSheet() {
    setSheetOpen(true);
  }

  async function handleDelete() {
    if (!geofence) {
      return;
    }

    const confirmed = window.confirm(
      formatMessage(copy.deleteConfirm, { name: geofence.name }),
    );
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      await deleteVehicleGeofence(vehicle.id, geofence.id);
      showSuccessToast({
        title: copy.toast.deleted.title,
        description: copy.toast.deleted.description,
      });
      await loadGeofence();
    } catch (error) {
      showErrorToast({
        title: copy.toast.deleteFailed.title,
        description:
          error instanceof Error ? error.message : copy.toast.deleteFailed.description,
      });
    } finally {
      setDeleting(false);
    }
  }

  const ShapeIcon = geofence?.shape === "polygon" ? Hexagon : Circle;
  const isRestricted = geofence?.kind === "restricted";

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className={cn("text-base sm:text-lg", adminHeadingClass)}>{copy.title}</h2>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{copy.description}</p>
        </div>

        {canWrite && !loading && geofence ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              onClick={openSheet}
              className={cn(adminPrimaryButtonClass, "shadow-sm")}
            >
              <Pencil className="size-3.5" />
              {copy.edit}
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-200 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              <Trash2 className="size-3.5" />
              {copy.delete}
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-5">
          <div className="h-[28rem] animate-pulse rounded-2xl bg-slate-100 dark:bg-muted/40" />
          <div className="h-[28rem] animate-pulse rounded-2xl bg-slate-100 dark:bg-muted/40" />
        </div>
      ) : !geofence || !mapValue ? (
        <section className={cn(adminCardClass, "rounded-2xl p-4 sm:p-6")}>
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-12 text-center dark:border-border dark:bg-muted/20">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#1C3A34] text-white shadow-sm dark:bg-[var(--brand-accent)] dark:text-[#151a21]">
              <MapPinned className="size-6" />
            </div>
            <p className={cn("text-base", adminHeadingClass)}>{copy.emptyTitle}</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {copy.emptyHint}
            </p>
            {canWrite ? (
              <Button
                type="button"
                className={cn(adminPrimaryButtonClass, "mt-6 shadow-sm")}
                onClick={openSheet}
              >
                <Plus className="size-4" />
                {copy.create}
              </Button>
            ) : null}
          </div>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)] lg:gap-5">
          <section className={cn(adminCardClass, "flex flex-col overflow-hidden rounded-2xl")}>
            <div className="border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-border">
              <div className="flex items-start gap-3">
                <div className={cn(adminIconBoxClass, "shrink-0")}>
                  <ShapeIcon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                    {copy.details.overview}
                  </p>
                  <p
                    className={cn(
                      "mt-1 truncate text-lg leading-tight tracking-tight",
                      adminHeadingClass,
                    )}
                    title={geofence.name}
                  >
                    {geofence.name}
                  </p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={
                        isRestricted
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800"
                      }
                    >
                      {copy.kind[geofence.kind]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        geofence.is_active
                          ? "border-sky-200 bg-sky-50 text-sky-800"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }
                    >
                      {geofence.is_active ? copy.active : copy.inactive}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 p-4 sm:p-5">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-4 dark:border-border dark:bg-white/[0.03]">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Ruler className="size-3.5 text-slate-400" />
                  {copy.details.coverage}
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-xl leading-tight tracking-tight break-words sm:text-2xl",
                    adminHeadingClass,
                  )}
                >
                  {fenceCoverageLabel(geofence, copy)}
                </p>
              </div>

              <dl className="grid gap-2.5 sm:grid-cols-2">
                <DetailField
                  icon={ShapeIcon}
                  label={copy.fields.shape}
                  value={copy.shape[geofence.shape]}
                />
                <DetailField
                  icon={ShieldCheck}
                  label={copy.fields.kind}
                  value={copy.kind[geofence.kind]}
                />
                {center ? (
                  <DetailField
                    icon={MapPinned}
                    label={copy.details.center}
                    value={`${center.latitude.toFixed(5)}, ${center.longitude.toFixed(5)}`}
                    mono
                    className="sm:col-span-2"
                  />
                ) : null}
                <DetailField
                  icon={Clock3}
                  label={copy.details.updatedAt}
                  value={formatGlobalDateTime(geofence.updated_at, locale)}
                  className="sm:col-span-2"
                />
              </dl>
            </div>

            {!geofence.is_active ? (
              <div className="border-t border-slate-100 px-4 py-3 sm:px-5 dark:border-border">
                <p className="text-xs leading-relaxed text-slate-500">
                  {copy.fields.activeHint}
                </p>
              </div>
            ) : null}
          </section>

          <section className={cn(adminCardClass, "flex flex-col overflow-hidden rounded-2xl")}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5 dark:border-border">
              <div className="flex min-w-0 items-start gap-3">
                <div className={cn(adminIconBoxClass, "shrink-0")}>
                  <MapPinned className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className={cn("text-sm leading-snug", adminHeadingClass)}>
                    {copy.details.mapTitle}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                    {copy.details.mapHint}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  {copy.kind.allowed}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500" />
                  {copy.kind.restricted}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <LazyGeofenceMapEditor
                shape={geofence.shape}
                kind={geofence.kind}
                value={mapValue}
                readOnly
                showHint={false}
                height={420}
                labels={{
                  clickForCenter: copy.map.clickForCenter,
                  clickForVertex: copy.map.clickForVertex,
                  radius: copy.map.radius,
                  undoPoint: copy.map.undoPoint,
                  clearPoints: copy.map.clearPoints,
                  recenter: copy.map.recenter,
                  zoomIn: copy.map.zoomIn,
                  zoomOut: copy.map.zoomOut,
                }}
              />
            </div>
          </section>
        </div>
      )}

      <GeofenceEditorSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        vehicle={vehicle}
        geofence={geofence}
        detail={detail}
        onSuccess={() => void loadGeofence()}
      />
    </div>
  );
}
