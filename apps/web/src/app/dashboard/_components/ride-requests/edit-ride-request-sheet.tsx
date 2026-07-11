"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { startOfDay } from "date-fns";
import type { RideRequest, RideRequestLocationOption } from "@smart-dispatch/types";
import {
  AdminSelectField,
  AdminTextareaField,
  AdminTextField,
} from "@/components/shared/admin-form-field";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import {
  AdminTimePicker,
  type TimeValue,
} from "@/components/shared/admin-time-picker";
import type { CoordinateMapPickerProps } from "@/components/shared/coordinate-map-picker/coordinate-map-picker";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminHeadingClass, adminPrimaryButtonClass } from "@/lib/admin-theme";
import { isValidCoordinatePair } from "@/lib/map/coordinates";
import {
  fetchRideRequestFormOptions,
  updateRideRequest,
  type RideRequestVehicleTypeOption,
} from "@/lib/ride-request-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  formatMessage,
  getCustomerRequestHistoryMessages,
  getCustomerRequestsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import {
  buildLocationAddress,
  buildVehicleTypeLabel,
  combineScheduledDateTime,
  filterLocationsByRegion,
  buildDropoffLocationItems,
  getMinTimeForDate,
  splitScheduledDateTime,
  type CoordinateState,
  type RideRequestFieldErrors,
  type RideRequestFormState,
} from "./ride-request-utils";

const LazyCoordinateMapPicker = dynamic<CoordinateMapPickerProps>(
  () =>
    import("@/components/shared/coordinate-map-picker/coordinate-map-picker").then(
      (mod) => mod.CoordinateMapPicker,
    ),
  { ssr: false },
);

type EditRideRequestSheetProps = {
  request: RideRequest | null;
  open: boolean;
  locale: string;
  onOpenChange: (open: boolean) => void;
  onUpdated: (request: RideRequest) => void;
};

function buildInitialForm(request: RideRequest): RideRequestFormState {
  return {
    pickupAddress: request.pickup_address,
    dropoffAddress: request.dropoff_address,
    vehicleTypeId: request.vehicle_type_id ?? "",
    vehicleClassId: request.vehicle_class_id ?? "",
    regionId: request.region_id ?? "",
    passengerCount: String(request.passenger_count),
    notes: request.notes ?? "",
  };
}

export function EditRideRequestSheet({
  request,
  open,
  locale,
  onOpenChange,
  onUpdated,
}: EditRideRequestSheetProps) {
  const historyCopy = getCustomerRequestHistoryMessages(locale as "en" | "am");
  const copy = getCustomerRequestsMessages(locale as "en" | "am");
  const [form, setForm] = useState<RideRequestFormState | null>(null);
  const [pickupCoordinates, setPickupCoordinates] = useState<CoordinateState>({});
  const [dropoffCoordinates, setDropoffCoordinates] = useState<CoordinateState>({});
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [dropoffLocationId, setDropoffLocationId] = useState("");
  const [useCustomPickup, setUseCustomPickup] = useState(false);
  const [useCustomDropoff, setUseCustomDropoff] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState<TimeValue | undefined>();
  const [errors, setErrors] = useState<RideRequestFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<RideRequestVehicleTypeOption[]>([]);
  const [regions, setRegions] = useState<Array<{ label: string; value: string }>>([]);
  const [pickupLocations, setPickupLocations] = useState<RideRequestLocationOption[]>([]);
  const [dropoffLocations, setDropoffLocations] = useState<RideRequestLocationOption[]>([]);

  useEffect(() => {
    if (!open || !request) {
      return;
    }

    let cancelled = false;

    async function load() {
      if (!request) return;

      const currentRequest = request;
      setLoading(true);
      setErrors({});

      try {
        const options = await fetchRideRequestFormOptions(locale, currentRequest.region_id ?? undefined);
        if (cancelled) return;

        setVehicleTypes(options.vehicle_types);
        setRegions(options.regions.map((region) => ({ label: region.name, value: region.id })));
        setPickupLocations(options.pickup_locations);
        setDropoffLocations(options.dropoff_locations);
        setForm(buildInitialForm(currentRequest));
        setPickupLocationId(currentRequest.pickup_location_id ?? "");
        setDropoffLocationId(currentRequest.dropoff_location_id ?? "");
        setUseCustomPickup(!currentRequest.pickup_location_id);
        setUseCustomDropoff(!currentRequest.dropoff_location_id);
        setPickupCoordinates({
          latitude: currentRequest.pickup_latitude ?? undefined,
          longitude: currentRequest.pickup_longitude ?? undefined,
        });
        setDropoffCoordinates({
          latitude: currentRequest.dropoff_latitude ?? undefined,
          longitude: currentRequest.dropoff_longitude ?? undefined,
        });
        const schedule = splitScheduledDateTime(currentRequest.scheduled_at);
        setScheduledDate(schedule.date);
        setScheduledTime(schedule.time);
      } catch (error) {
        if (!cancelled) {
          showErrorToast({
            title: error instanceof Error ? error.message : historyCopy.errors.loadFailed,
          });
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [historyCopy.errors.loadFailed, locale, onOpenChange, open, request]);

  const selectedVehicleType = useMemo(
    () => vehicleTypes.find((vehicleType) => vehicleType.id === form?.vehicleTypeId),
    [form?.vehicleTypeId, vehicleTypes],
  );

  const vehicleTypeItems = useMemo(
    () =>
      vehicleTypes.map((vehicleType) => ({
        label: buildVehicleTypeLabel(vehicleType, copy),
        value: vehicleType.id,
      })),
    [copy, vehicleTypes],
  );

  const vehicleClassItems = useMemo(
    () =>
      (selectedVehicleType?.allowed_classes ?? []).map((vehicleClass) => ({
        label: vehicleClass.name,
        value: vehicleClass.id,
      })),
    [selectedVehicleType],
  );

  const pickupLocationItems = useMemo(
    () =>
      filterLocationsByRegion(pickupLocations, form?.regionId ?? "").map((location) => ({
        label: location.name,
        value: location.id,
      })),
    [form?.regionId, pickupLocations],
  );

  const dropoffLocationItems = useMemo(
    () =>
      buildDropoffLocationItems(
        filterLocationsByRegion(dropoffLocations, form?.regionId ?? ""),
        pickupLocations,
        pickupLocationId,
        useCustomPickup,
        copy.pickupTag,
      ),
    [
      copy.pickupTag,
      dropoffLocations,
      form?.regionId,
      pickupLocations,
      pickupLocationId,
      useCustomPickup,
    ],
  );

  const showPickupBackup = pickupLocationItems.length === 0 || useCustomPickup;
  const showDropoffBackup = dropoffLocationItems.length === 0 || useCustomDropoff;
  const scheduledMinTime = useMemo(() => getMinTimeForDate(scheduledDate), [scheduledDate]);
  const passengerMax = selectedVehicleType?.passenger_capacity ?? 50;

  function updateField<K extends keyof RideRequestFormState>(key: K, value: RideRequestFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function applyPickupLocation(locationId: string) {
    const location = pickupLocations.find((entry) => entry.id === locationId);
    if (!location || !form) return;

    setPickupLocationId(locationId);
    setUseCustomPickup(false);
    setForm({
      ...form,
      pickupAddress: buildLocationAddress(location),
      regionId: form.regionId || location.region_id,
    });
    setPickupCoordinates({ latitude: location.latitude, longitude: location.longitude });

    if (dropoffLocationId === locationId) {
      setDropoffLocationId("");
      setForm({ ...form, dropoffAddress: "" });
      setDropoffCoordinates({});
    }
  }

  function applyDropoffLocation(locationId: string) {
    const location =
      dropoffLocations.find((entry) => entry.id === locationId) ??
      pickupLocations.find((entry) => entry.id === locationId);
    if (!location || !form) return;

    setDropoffLocationId(locationId);
    setUseCustomDropoff(false);
    setForm({
      ...form,
      dropoffAddress: buildLocationAddress(location),
      regionId: form.regionId || location.region_id,
    });
    setDropoffCoordinates({ latitude: location.latitude, longitude: location.longitude });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request || !form || !request.can_edit) {
      return;
    }

    const nextErrors: RideRequestFieldErrors = {};
    const pickupAddress = form.pickupAddress.trim();
    const dropoffAddress = form.dropoffAddress.trim();
    const passengerCount = Number(form.passengerCount);

    if (!showPickupBackup && !pickupLocationId) {
      nextErrors.pickupSavedLocation = copy.errors.pickupSavedRequired;
    } else if (showPickupBackup) {
      if (!pickupAddress) nextErrors.pickupAddress = copy.errors.pickupRequired;
      if (!isValidCoordinatePair(pickupCoordinates.latitude, pickupCoordinates.longitude)) {
        nextErrors.pickupCoordinates = copy.errors.pickupCoordinatesRequired;
      }
    }

    if (!showDropoffBackup && !dropoffLocationId) {
      nextErrors.dropoffSavedLocation = copy.errors.dropoffSavedRequired;
    } else if (showDropoffBackup) {
      if (!dropoffAddress) nextErrors.dropoffAddress = copy.errors.dropoffRequired;
      if (!isValidCoordinatePair(dropoffCoordinates.latitude, dropoffCoordinates.longitude)) {
        nextErrors.dropoffCoordinates = copy.errors.dropoffCoordinatesRequired;
      }
    }

    if (
      !showPickupBackup &&
      !showDropoffBackup &&
      pickupLocationId &&
      dropoffLocationId &&
      pickupLocationId === dropoffLocationId
    ) {
      nextErrors.dropoffSavedLocation = copy.errors.dropoffSameAsPickup;
    }

    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 50) {
      nextErrors.passengerCount = copy.errors.passengerCountInvalid;
    }

    const hasScheduledDate = Boolean(scheduledDate);
    const hasScheduledTime = Boolean(scheduledTime);
    if (hasScheduledDate !== hasScheduledTime) {
      nextErrors.scheduledAt = copy.errors.scheduledAtIncomplete;
    } else if (hasScheduledDate && hasScheduledTime) {
      const combinedSchedule = combineScheduledDateTime(scheduledDate, scheduledTime);
      if (!combinedSchedule || combinedSchedule.getTime() <= Date.now()) {
        nextErrors.scheduledAt = copy.errors.scheduledAtPast;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      const combinedSchedule = combineScheduledDateTime(scheduledDate, scheduledTime);
      const updated = await updateRideRequest(request.id, {
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        pickup_location_id: showPickupBackup ? null : pickupLocationId || null,
        dropoff_location_id: showDropoffBackup ? null : dropoffLocationId || null,
        pickup_latitude: pickupCoordinates.latitude ?? null,
        pickup_longitude: pickupCoordinates.longitude ?? null,
        dropoff_latitude: dropoffCoordinates.latitude ?? null,
        dropoff_longitude: dropoffCoordinates.longitude ?? null,
        vehicle_type_id: form.vehicleTypeId || null,
        vehicle_class_id: form.vehicleClassId || null,
        region_id: form.regionId || null,
        passenger_count: passengerCount,
        scheduled_at: combinedSchedule ? combinedSchedule.toISOString() : null,
        notes: form.notes.trim() || null,
      });

      showSuccessToast({ title: historyCopy.toast.updated });
      onUpdated(updated);
      onOpenChange(false);
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : historyCopy.errors.updateFailed,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200/80 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>{historyCopy.editTitle}</SheetTitle>
          <SheetDescription>{historyCopy.editDescription}</SheetDescription>
        </SheetHeader>

        {!request?.can_edit ? (
          <div className="px-6 py-8 text-sm text-slate-500">{historyCopy.notEditable}</div>
        ) : form ? (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void handleSubmit(event)}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <AdminSelectField
                id="edit-region"
                label={copy.region}
                value={form.regionId || null}
                onValueChange={(value) => updateField("regionId", value)}
                items={regions}
                placeholder={copy.regionPlaceholder}
                optional
                optionalLabel={copy.optional}
                disabled={loading || submitting}
              />

              {!showPickupBackup ? (
                <AdminSelectField
                  id="edit-pickup-saved"
                  label={copy.pickupSavedLocation}
                  value={pickupLocationId || null}
                  onValueChange={(value) => (value ? applyPickupLocation(value) : setPickupLocationId(""))}
                  items={pickupLocationItems}
                  placeholder={copy.pickupSavedLocationPlaceholder}
                  disabled={loading || submitting}
                  error={errors.pickupSavedLocation}
                />
              ) : (
                <>
                  <AdminTextField
                    id="edit-pickup-address"
                    label={copy.pickupAddress}
                    value={form.pickupAddress}
                    onChange={(event) => updateField("pickupAddress", event.target.value)}
                    error={errors.pickupAddress}
                    disabled={loading || submitting}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#1C3A34]">{copy.pickupLocation}</Label>
                    <LazyCoordinateMapPicker
                      latitude={pickupCoordinates.latitude}
                      longitude={pickupCoordinates.longitude}
                      onCoordinatesChange={(latitude, longitude) =>
                        setPickupCoordinates({ latitude, longitude })
                      }
                      visible={open && !loading}
                      title={copy.pickupLocation}
                      hint={copy.mapPickerHint}
                      loadingLabel={copy.mapLoading}
                      emptyLabel={copy.mapEmpty}
                      recenterLabel={copy.mapRecenter}
                    />
                    {errors.pickupCoordinates ? (
                      <p className="text-xs text-red-600">{errors.pickupCoordinates}</p>
                    ) : null}
                  </div>
                </>
              )}

              {pickupLocationItems.length > 0 ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-[#1C3A34]"
                  onClick={() => {
                    if (showPickupBackup) {
                      setUseCustomPickup(false);
                      setPickupLocationId("");
                    } else {
                      setUseCustomPickup(true);
                      setPickupLocationId("");
                    }
                  }}
                  disabled={loading || submitting}
                >
                  {showPickupBackup ? copy.useSavedPickup : copy.useCustomPickup}
                </Button>
              ) : null}

              {!showDropoffBackup ? (
                <AdminSelectField
                  id="edit-dropoff-saved"
                  label={copy.dropoffSavedLocation}
                  value={dropoffLocationId || null}
                  onValueChange={(value) => (value ? applyDropoffLocation(value) : setDropoffLocationId(""))}
                  items={dropoffLocationItems}
                  placeholder={copy.dropoffSavedLocationPlaceholder}
                  disabled={loading || submitting}
                  error={errors.dropoffSavedLocation}
                />
              ) : (
                <>
                  <AdminTextField
                    id="edit-dropoff-address"
                    label={copy.dropoffAddress}
                    value={form.dropoffAddress}
                    onChange={(event) => updateField("dropoffAddress", event.target.value)}
                    error={errors.dropoffAddress}
                    disabled={loading || submitting}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-[#1C3A34]">{copy.dropoffLocation}</Label>
                    <LazyCoordinateMapPicker
                      latitude={dropoffCoordinates.latitude}
                      longitude={dropoffCoordinates.longitude}
                      onCoordinatesChange={(latitude, longitude) =>
                        setDropoffCoordinates({ latitude, longitude })
                      }
                      visible={open && !loading}
                      title={copy.dropoffLocation}
                      hint={copy.mapPickerHint}
                      loadingLabel={copy.mapLoading}
                      emptyLabel={copy.mapEmpty}
                      recenterLabel={copy.mapRecenter}
                    />
                    {errors.dropoffCoordinates ? (
                      <p className="text-xs text-red-600">{errors.dropoffCoordinates}</p>
                    ) : null}
                  </div>
                </>
              )}

              {dropoffLocationItems.length > 0 ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-[#1C3A34]"
                  onClick={() => {
                    if (showDropoffBackup) {
                      setUseCustomDropoff(false);
                      setDropoffLocationId("");
                    } else {
                      setUseCustomDropoff(true);
                      setDropoffLocationId("");
                    }
                  }}
                  disabled={loading || submitting}
                >
                  {showDropoffBackup ? copy.useSavedDropoff : copy.useCustomDropoff}
                </Button>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <AdminSelectField
                  id="edit-vehicle-type"
                  label={copy.vehicleType}
                  value={form.vehicleTypeId || null}
                  onValueChange={(value) => updateField("vehicleTypeId", value)}
                  items={vehicleTypeItems}
                  placeholder={copy.vehicleTypePlaceholder}
                  optional
                  optionalLabel={copy.optional}
                  disabled={loading || submitting}
                />
                <AdminSelectField
                  id="edit-vehicle-class"
                  label={copy.vehicleClass}
                  value={form.vehicleClassId || null}
                  onValueChange={(value) => updateField("vehicleClassId", value)}
                  items={vehicleClassItems}
                  placeholder={copy.vehicleClassPlaceholder}
                  optional
                  optionalLabel={copy.optional}
                  disabled={loading || submitting || !form.vehicleTypeId}
                  error={errors.vehicleClassId}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <AdminTextField
                  id="edit-passengers"
                  label={copy.passengerCount}
                  type="number"
                  min={1}
                  max={passengerMax}
                  value={form.passengerCount}
                  onChange={(event) => updateField("passengerCount", event.target.value)}
                  error={errors.passengerCount}
                  disabled={loading || submitting}
                />
                <AdminDatePicker
                  id="edit-scheduled-date"
                  label={copy.scheduledDate}
                  placeholder={copy.pickDate}
                  clearLabel={copy.clearDate}
                  todayLabel={copy.today}
                  value={scheduledDate}
                  minDate={startOfDay(new Date())}
                  disabled={loading || submitting}
                  onChange={setScheduledDate}
                />
                <AdminTimePicker
                  id="edit-scheduled-time"
                  label={copy.scheduledTime}
                  placeholder={copy.pickTime}
                  clearLabel={copy.clearTime}
                  hourLabel={copy.hour}
                  minuteLabel={copy.minute}
                  periodLabel={copy.period}
                  amLabel={copy.am}
                  pmLabel={copy.pm}
                  applyLabel={copy.applyTime}
                  value={scheduledTime}
                  minTime={scheduledMinTime}
                  locale={locale}
                  hour12
                  disabled={loading || submitting || !scheduledDate}
                  onChange={setScheduledTime}
                />
              </div>
              {errors.scheduledAt ? (
                <p className="text-xs text-red-600">{errors.scheduledAt}</p>
              ) : null}

              <AdminTextareaField
                id="edit-notes"
                label={copy.notes}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder={copy.notesPlaceholder}
                optional
                optionalLabel={copy.optional}
                disabled={loading || submitting}
                rows={3}
              />
            </div>

            <SheetFooter className="border-t border-slate-200/80 bg-[#f8fafb]/70 px-6 py-4">
              <Button
                type="submit"
                className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                disabled={loading || submitting}
              >
                {submitting ? historyCopy.saving : historyCopy.saveChanges}
              </Button>
            </SheetFooter>
          </form>
        ) : (
          <div className="px-6 py-8 text-sm text-slate-500">{copy.loading}</div>
        )}
      </SheetContent>
    </Sheet>
  );
}
