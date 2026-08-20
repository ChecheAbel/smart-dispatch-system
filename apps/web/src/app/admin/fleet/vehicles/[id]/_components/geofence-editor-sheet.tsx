"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useState, type FormEvent } from "react";
import { MapPinned } from "lucide-react";
import type {
  GeofenceKind,
  GeofenceShape,
  Vehicle,
  VehicleGeofence,
} from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
  adminSelectTriggerClass,
} from "@/lib/admin-theme";
import type { GeofenceMapEditorValue } from "@/components/shared/geofence-map-editor";
import {
  createVehicleGeofence,
  updateVehicleGeofence,
} from "@/lib/vehicle-geofence-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";

const LazyGeofenceMapEditor = dynamic(
  () =>
    import("@/components/shared/geofence-map-editor").then((mod) => mod.GeofenceMapEditor),
  { ssr: false },
);

type GeofenceEditorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle;
  geofence?: VehicleGeofence | null;
  detail: ReturnType<typeof getAdminVehiclesMessages>["detail"];
  onSuccess?: () => void;
};

type FormState = {
  name: string;
  kind: GeofenceKind;
  shape: GeofenceShape;
  isActive: boolean;
  map: GeofenceMapEditorValue;
};

function emptyForm(seed?: {
  latitude?: number | null;
  longitude?: number | null;
}): FormState {
  return {
    name: "",
    kind: "allowed",
    shape: "circle",
    isActive: true,
    map: {
      center:
        seed?.latitude != null && seed?.longitude != null
          ? { latitude: seed.latitude, longitude: seed.longitude }
          : null,
      radiusM: 500,
      coordinates: [],
    },
  };
}

function formFromGeofence(geofence: VehicleGeofence): FormState {
  return {
    name: geofence.name,
    kind: geofence.kind,
    shape: geofence.shape,
    isActive: geofence.is_active,
    map: {
      center:
        geofence.center_latitude != null && geofence.center_longitude != null
          ? {
              latitude: geofence.center_latitude,
              longitude: geofence.center_longitude,
            }
          : null,
      radiusM: geofence.radius_m ?? 500,
      coordinates: geofence.coordinates ?? [],
    },
  };
}

export function GeofenceEditorSheet({
  open,
  onOpenChange,
  vehicle,
  geofence = null,
  detail,
  onSuccess,
}: GeofenceEditorSheetProps) {
  const copy = detail.geofencing;
  const isEdit = Boolean(geofence);
  const formId = useId();
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setNameError(null);
    setMapError(null);
    setForm(geofence ? formFromGeofence(geofence) : emptyForm());
  }, [geofence, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setNameError(copy.validation.nameRequired);
      return;
    }

    if (form.shape === "circle") {
      if (!form.map.center || form.map.radiusM <= 0) {
        setMapError(copy.validation.circleRequired);
        return;
      }
    } else if (form.map.coordinates.length < 3) {
      setMapError(copy.validation.polygonRequired);
      return;
    }

    setSaving(true);
    setNameError(null);
    setMapError(null);

    try {
      const payload = {
        name,
        kind: form.kind,
        shape: form.shape,
        is_active: form.isActive,
        center_latitude: form.shape === "circle" ? form.map.center?.latitude ?? null : null,
        center_longitude: form.shape === "circle" ? form.map.center?.longitude ?? null : null,
        radius_m: form.shape === "circle" ? form.map.radiusM : null,
        coordinates: form.shape === "polygon" ? form.map.coordinates : null,
      };

      if (isEdit && geofence) {
        await updateVehicleGeofence(vehicle.id, geofence.id, payload);
        showSuccessToast({
          title: copy.toast.updated.title,
          description: copy.toast.updated.description,
        });
      } else {
        await createVehicleGeofence(vehicle.id, payload);
        showSuccessToast({
          title: copy.toast.created.title,
          description: copy.toast.created.description,
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      showErrorToast({
        title: copy.toast.saveFailed.title,
        description:
          error instanceof Error ? error.message : copy.toast.saveFailed.description,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:w-full data-[side=right]:sm:w-[52rem] data-[side=right]:sm:max-w-[calc(100vw-2rem)]">
        <SheetHeader className="shrink-0 border-b border-slate-100 px-6 py-5 pr-14 text-left dark:border-border">
          <SheetTitle className={cn("text-lg leading-tight", adminHeadingClass)}>
            {isEdit ? copy.editTitle : copy.createTitle}
          </SheetTitle>
          <SheetDescription className="mt-1.5 leading-relaxed">
            {isEdit ? copy.editSubtitle : copy.createSubtitle}
          </SheetDescription>
        </SheetHeader>

        <form
          id={formId}
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
              <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 dark:border-border">
                <div
                  className={cn(
                    adminIconBoxClass,
                    "shrink-0 bg-[#1C3A34] text-white dark:bg-[#C9B87A] dark:text-[#151a21]",
                  )}
                >
                  <MapPinned className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                    {vehicle.plate_number}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#1C3A34] dark:text-foreground">
                    {isEdit ? copy.editTitle : copy.createTitle}
                  </p>
                </div>
              </div>

              <div className="space-y-5 px-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="geofence-name">{copy.fields.name}</Label>
                  <Input
                    id="geofence-name"
                    className={cn(adminInputClass, "bg-white dark:bg-muted/55")}
                    value={form.name}
                    placeholder={copy.fields.namePlaceholder}
                    disabled={saving}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                  />
                  {nameError ? <p className="text-xs text-red-600">{nameError}</p> : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="geofence-kind">{copy.fields.kind}</Label>
                    <Select
                      value={form.kind}
                      disabled={saving}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, kind: value as GeofenceKind }))
                      }
                    >
                      <SelectTrigger
                        id="geofence-kind"
                        className={cn(adminSelectTriggerClass, "justify-between")}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allowed">{copy.kind.allowed}</SelectItem>
                        <SelectItem value="restricted">{copy.kind.restricted}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="geofence-shape">{copy.fields.shape}</Label>
                    <Select
                      value={form.shape}
                      disabled={saving}
                      onValueChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          shape: value as GeofenceShape,
                          map: {
                            ...prev.map,
                            coordinates: value === "polygon" ? prev.map.coordinates : [],
                          },
                        }))
                      }
                    >
                      <SelectTrigger
                        id="geofence-shape"
                        className={cn(adminSelectTriggerClass, "justify-between")}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="circle">{copy.shape.circle}</SelectItem>
                        <SelectItem value="polygon">{copy.shape.polygon}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3.5 dark:border-border dark:bg-white/[0.03]">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-foreground">
                      {copy.fields.active}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-500">
                      {copy.fields.activeHint}
                    </p>
                  </div>
                  <Switch
                    checked={form.isActive}
                    disabled={saving}
                    className="mt-0.5 shrink-0"
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                </div>
              </div>
            </Card>

            <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
              <div className="border-b border-slate-100 px-4 py-3 dark:border-border">
                <p className="text-sm font-semibold text-slate-800 dark:text-foreground">
                  {copy.shape[form.shape]}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  {form.shape === "circle" ? copy.map.clickForCenter : copy.map.clickForVertex}
                </p>
              </div>

              <div className="space-y-4 px-4 py-4">
                <LazyGeofenceMapEditor
                  shape={form.shape}
                  kind={form.kind}
                  value={form.map}
                  onChange={(map) => setForm((prev) => ({ ...prev, map }))}
                  height={360}
                  showHint={false}
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
                {mapError ? <p className="text-xs text-red-600">{mapError}</p> : null}
              </div>
            </Card>
          </div>

          <SheetFooter className="mt-0 shrink-0 flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-border dark:bg-[#171c24]">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {copy.cancel}
            </Button>
            <Button type="submit" form={formId} className={adminPrimaryButtonClass} disabled={saving}>
              {saving ? copy.saving : isEdit ? copy.save : copy.create}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
