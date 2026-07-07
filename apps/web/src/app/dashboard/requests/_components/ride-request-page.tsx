"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { startOfDay } from "date-fns";
import { CalendarClock, MapPin, Navigation, Route } from "lucide-react";
import type { RideRequest, RideRequestLocationOption, RideRequestStatus, VehicleType } from "@smart-dispatch/types";
import { useLocale, usePermission } from "@/components/shared/providers";
import {
  AdminSelectField,
  AdminTextareaField,
  AdminTextField,
} from "@/components/shared/admin-form-field";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import {
  AdminTimePicker,
  roundUpToMinuteInterval,
  type TimeValue,
} from "@/components/shared/admin-time-picker";
import type { CoordinateMapPickerProps } from "@/components/shared/coordinate-map-picker/coordinate-map-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  adminBadgeGoldClass,
  adminCardClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  DEFAULT_MAP_CENTER,
  isValidCoordinatePair,
} from "@/lib/map/coordinates";
import {
  createRideRequest,
  fetchMyRideRequests,
  fetchRideRequestFormOptions,
  type RideRequestVehicleTypeOption,
} from "@/lib/ride-request-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getCustomerRequestsMessages } from "@/translations";
import { cn } from "@/lib/utils";

const LazyCoordinateMapPicker = dynamic<CoordinateMapPickerProps>(
  () =>
    import("@/components/shared/coordinate-map-picker/coordinate-map-picker").then(
      (mod) => mod.CoordinateMapPicker,
    ),
  { ssr: false },
);

type RideRequestFormState = {
  pickupAddress: string;
  dropoffAddress: string;
  vehicleTypeId: string;
  vehicleClassId: string;
  regionId: string;
  passengerCount: string;
  notes: string;
};

type RideRequestFieldErrors = Partial<
  Record<keyof RideRequestFormState | "pickupCoordinates" | "dropoffCoordinates" | "scheduledAt", string>
>;

type CoordinateState = {
  latitude?: number;
  longitude?: number;
};

const emptyForm: RideRequestFormState = {
  pickupAddress: "",
  dropoffAddress: "",
  vehicleTypeId: "",
  vehicleClassId: "",
  regionId: "",
  passengerCount: "1",
  notes: "",
};

function statusBadgeClass(status: RideRequestStatus) {
  switch (status) {
    case "pending":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "confirmed":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "in_progress":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "cancelled":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "";
  }
}

function formatScheduledAt(value: string | null, locale: string) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function buildVehicleTypeLabel(vehicleType: VehicleType, copy: ReturnType<typeof getCustomerRequestsMessages>) {
  if (vehicleType.passenger_capacity) {
    return formatMessage(copy.vehicleTypeOption, {
      name: vehicleType.name,
      capacity: vehicleType.passenger_capacity,
    });
  }

  return formatMessage(copy.vehicleTypeOptionNoCapacity, { name: vehicleType.name });
}

function combineScheduledDateTime(date?: Date, time?: TimeValue): Date | null {
  if (!date || !time) {
    return null;
  }

  const combined = new Date(date);
  combined.setHours(time.hour, time.minute, 0, 0);
  return combined;
}

function getMinTimeForDate(date?: Date): TimeValue | undefined {
  if (!date || startOfDay(date).getTime() !== startOfDay(new Date()).getTime()) {
    return undefined;
  }

  return roundUpToMinuteInterval(new Date());
}

function isTimeBeforeMin(time: TimeValue, minTime: TimeValue) {
  return time.hour < minTime.hour || (time.hour === minTime.hour && time.minute < minTime.minute);
}

function buildLocationAddress(location: RideRequestLocationOption) {
  return location.address ? `${location.name}, ${location.address}` : location.name;
}

function filterLocationsByRegion(
  locations: RideRequestLocationOption[],
  regionId: string,
) {
  if (!regionId) {
    return locations;
  }

  return locations.filter((location) => location.region_id === regionId);
}

export function RideRequestPage() {
  const { locale } = useLocale();
  const copy = getCustomerRequestsMessages(locale);
  const canSubmitRequest = usePermission("customer_requests.write");
  const [form, setForm] = useState<RideRequestFormState>(emptyForm);
  const [pickupCoordinates, setPickupCoordinates] = useState<CoordinateState>({});
  const [dropoffCoordinates, setDropoffCoordinates] = useState<CoordinateState>({});
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [dropoffLocationId, setDropoffLocationId] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState<TimeValue | undefined>();
  const [errors, setErrors] = useState<RideRequestFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vehicleTypes, setVehicleTypes] = useState<RideRequestVehicleTypeOption[]>([]);
  const [regions, setRegions] = useState<Array<{ label: string; value: string }>>([]);
  const [pickupLocations, setPickupLocations] = useState<RideRequestLocationOption[]>([]);
  const [dropoffLocations, setDropoffLocations] = useState<RideRequestLocationOption[]>([]);
  const [requests, setRequests] = useState<RideRequest[]>([]);

  const vehicleTypeItems = useMemo(
    () =>
      vehicleTypes.map((vehicleType) => ({
        label: buildVehicleTypeLabel(vehicleType, copy),
        value: vehicleType.id,
      })),
    [copy, vehicleTypes],
  );

  const selectedVehicleType = useMemo(
    () => vehicleTypes.find((vehicleType) => vehicleType.id === form.vehicleTypeId),
    [form.vehicleTypeId, vehicleTypes],
  );

  const vehicleClassItems = useMemo(
    () =>
      (selectedVehicleType?.allowed_classes ?? []).map((vehicleClass) => ({
        label: vehicleClass.name,
        value: vehicleClass.id,
      })),
    [selectedVehicleType],
  );

  const passengerMax = selectedVehicleType?.passenger_capacity ?? 50;

  const filteredPickupLocations = useMemo(
    () => filterLocationsByRegion(pickupLocations, form.regionId),
    [form.regionId, pickupLocations],
  );

  const filteredDropoffLocations = useMemo(
    () => filterLocationsByRegion(dropoffLocations, form.regionId),
    [form.regionId, dropoffLocations],
  );

  const pickupLocationItems = useMemo(
    () =>
      filteredPickupLocations.map((location) => ({
        label: location.name,
        value: location.id,
      })),
    [filteredPickupLocations],
  );

  const dropoffLocationItems = useMemo(
    () =>
      filteredDropoffLocations.map((location) => ({
        label: location.name,
        value: location.id,
      })),
    [filteredDropoffLocations],
  );

  const scheduledMinTime = useMemo(() => getMinTimeForDate(scheduledDate), [scheduledDate]);

  const dropoffMapCenter = useMemo((): { latitude: number; longitude: number } => {
    const { latitude, longitude } = pickupCoordinates;

    if (isValidCoordinatePair(latitude, longitude)) {
      return { latitude: latitude!, longitude: longitude! };
    }

    return DEFAULT_MAP_CENTER;
  }, [pickupCoordinates.latitude, pickupCoordinates.longitude]);

  useEffect(() => {
    if (!scheduledDate || !scheduledTime) {
      return;
    }

    const minTime = getMinTimeForDate(scheduledDate);
    if (minTime && isTimeBeforeMin(scheduledTime, minTime)) {
      setScheduledTime(undefined);
    }
  }, [scheduledDate, scheduledTime]);

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      setLoading(true);

      try {
        const [options, rideRequests] = await Promise.all([
          fetchRideRequestFormOptions(locale),
          fetchMyRideRequests(locale),
        ]);

        if (cancelled) return;

        setVehicleTypes(options.vehicle_types);
        setRegions(
          options.regions.map((region) => ({
            label: region.name,
            value: region.id,
          })),
        );
        setPickupLocations(options.pickup_locations);
        setDropoffLocations(options.dropoff_locations);
        setRequests(rideRequests);
      } catch (error) {
        if (!cancelled) {
          showErrorToast({
            title: error instanceof Error ? error.message : copy.errors.submitFailed,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPageData();

    return () => {
      cancelled = true;
    };
  }, [copy.errors.submitFailed, locale]);

  function updateField<K extends keyof RideRequestFormState>(
    key: K,
    value: RideRequestFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));

    if (key === "pickupAddress") {
      setPickupLocationId("");
    }

    if (key === "dropoffAddress") {
      setDropoffLocationId("");
    }

    if (key === "regionId") {
      setPickupLocationId((currentPickupId) => {
        if (!currentPickupId) return currentPickupId;
        const stillValid = pickupLocations.some(
          (location) =>
            location.id === currentPickupId &&
            (!value || location.region_id === value),
        );
        return stillValid ? currentPickupId : "";
      });
      setDropoffLocationId((currentDropoffId) => {
        if (!currentDropoffId) return currentDropoffId;
        const stillValid = dropoffLocations.some(
          (location) =>
            location.id === currentDropoffId &&
            (!value || location.region_id === value),
        );
        return stillValid ? currentDropoffId : "";
      });
    }

    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function applyPickupLocation(locationId: string) {
    const location = pickupLocations.find((entry) => entry.id === locationId);
    if (!location) {
      return;
    }

    setPickupLocationId(locationId);
    setForm((current) => ({
      ...current,
      pickupAddress: buildLocationAddress(location),
      regionId: current.regionId || location.region_id,
    }));
    setPickupCoordinates({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setErrors((current) => {
      const next = { ...current };
      delete next.pickupAddress;
      delete next.pickupCoordinates;
      return next;
    });
  }

  function applyDropoffLocation(locationId: string) {
    const location = dropoffLocations.find((entry) => entry.id === locationId);
    if (!location) {
      return;
    }

    setDropoffLocationId(locationId);
    setForm((current) => ({
      ...current,
      dropoffAddress: buildLocationAddress(location),
      regionId: current.regionId || location.region_id,
    }));
    setDropoffCoordinates({
      latitude: location.latitude,
      longitude: location.longitude,
    });
    setErrors((current) => {
      const next = { ...current };
      delete next.dropoffAddress;
      delete next.dropoffCoordinates;
      return next;
    });
  }

  function handlePickupLocationChange(value: string) {
    if (!value) {
      setPickupLocationId("");
      return;
    }

    applyPickupLocation(value);
  }

  function handleDropoffLocationChange(value: string) {
    if (!value) {
      setDropoffLocationId("");
      return;
    }

    applyDropoffLocation(value);
  }

  function updateVehicleTypeId(value: string) {
    setForm((current) => {
      const nextType = vehicleTypes.find((vehicleType) => vehicleType.id === value);
      const classStillAllowed = nextType?.allowed_classes.some(
        (vehicleClass) => vehicleClass.id === current.vehicleClassId,
      );

      return {
        ...current,
        vehicleTypeId: value,
        vehicleClassId: classStillAllowed ? current.vehicleClassId : "",
      };
    });
    setErrors((current) => {
      const next = { ...current };
      delete next.vehicleTypeId;
      delete next.vehicleClassId;
      return next;
    });
  }

  const updatePickupCoordinates = useCallback((latitude: number, longitude: number) => {
    setPickupLocationId("");
    setPickupCoordinates({ latitude, longitude });
    setErrors((current) => {
      if (!current.pickupCoordinates) return current;
      const next = { ...current };
      delete next.pickupCoordinates;
      return next;
    });
  }, []);

  const updateDropoffCoordinates = useCallback((latitude: number, longitude: number) => {
    setDropoffLocationId("");
    setDropoffCoordinates({ latitude, longitude });
    setErrors((current) => {
      if (!current.dropoffCoordinates) return current;
      const next = { ...current };
      delete next.dropoffCoordinates;
      return next;
    });
  }, []);

  function resetFormState() {
    setForm(emptyForm);
    setPickupCoordinates({});
    setDropoffCoordinates({});
    setPickupLocationId("");
    setDropoffLocationId("");
    setScheduledDate(undefined);
    setScheduledTime(undefined);
    setErrors({});
  }

  function clearScheduledError() {
    setErrors((current) => {
      if (!current.scheduledAt) return current;
      const next = { ...current };
      delete next.scheduledAt;
      return next;
    });
  }

  function handleScheduledDateChange(date: Date | undefined) {
    setScheduledDate(date);
    if (!date) {
      setScheduledTime(undefined);
    }
    clearScheduledError();
  }

  function handleScheduledTimeChange(time: TimeValue | undefined) {
    setScheduledTime(time);
    clearScheduledError();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});

    const pickupAddress = form.pickupAddress.trim();
    const dropoffAddress = form.dropoffAddress.trim();
    const passengerCount = Number(form.passengerCount);
    const nextErrors: RideRequestFieldErrors = {};

    if (!pickupAddress) {
      nextErrors.pickupAddress = copy.errors.pickupRequired;
    }

    if (!dropoffAddress) {
      nextErrors.dropoffAddress = copy.errors.dropoffRequired;
    }

    if (!isValidCoordinatePair(pickupCoordinates.latitude, pickupCoordinates.longitude)) {
      nextErrors.pickupCoordinates = copy.errors.pickupCoordinatesRequired;
    }

    if (!isValidCoordinatePair(dropoffCoordinates.latitude, dropoffCoordinates.longitude)) {
      nextErrors.dropoffCoordinates = copy.errors.dropoffCoordinatesRequired;
    }

    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 50) {
      nextErrors.passengerCount = copy.errors.passengerCountInvalid;
    } else if (
      selectedVehicleType?.passenger_capacity &&
      passengerCount > selectedVehicleType.passenger_capacity
    ) {
      nextErrors.passengerCount = formatMessage(copy.errors.passengerExceedsCapacity, {
        capacity: selectedVehicleType.passenger_capacity,
      });
    }

    if (form.vehicleClassId && !form.vehicleTypeId) {
      nextErrors.vehicleClassId = copy.errors.vehicleClassRequiresType;
    } else if (
      form.vehicleClassId &&
      !selectedVehicleType?.allowed_classes.some(
        (vehicleClass) => vehicleClass.id === form.vehicleClassId,
      )
    ) {
      nextErrors.vehicleClassId = copy.errors.vehicleClassInvalid;
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

    const combinedSchedule = combineScheduledDateTime(scheduledDate, scheduledTime);

    try {
      const rideRequest = await createRideRequest({
        pickup_address: pickupAddress,
        dropoff_address: dropoffAddress,
        pickup_location_id: pickupLocationId || null,
        dropoff_location_id: dropoffLocationId || null,
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

      setRequests((current) => [rideRequest, ...current]);
      resetFormState();
      showSuccessToast({ title: copy.toast.submitted });
    } catch (error) {
      showErrorToast({
        title: error instanceof Error ? error.message : copy.errors.submitFailed,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formDisabled = submitting || loading;
  const submitDisabled = formDisabled || !canSubmitRequest;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <h2 className={`text-2xl font-extrabold tracking-tight ${adminHeadingClass}`}>
          {copy.title}
        </h2>
        <p className="max-w-3xl text-sm text-slate-500">{copy.description}</p>
      </div>

      <Card className={adminCardClass}>
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <Route className="size-4 text-[#1C3A34]" />
            {copy.formTitle}
          </CardTitle>
          <CardDescription>{copy.formDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <div className="grid gap-5 md:grid-cols-2">
              <AdminSelectField
                id="pickup-saved-location"
                label={copy.pickupSavedLocation}
                value={pickupLocationId || null}
                onValueChange={handlePickupLocationChange}
                items={pickupLocationItems}
                placeholder={copy.pickupSavedLocationPlaceholder}
                optional
                optionalLabel={copy.optional}
                disabled={formDisabled || pickupLocationItems.length === 0}
                hint={
                  pickupLocationItems.length === 0 ? copy.noPickupLocations : copy.savedLocationHint
                }
                containerClassName="md:col-span-2"
              />

              <AdminTextField
                id="pickup-address"
                label={copy.pickupAddress}
                value={form.pickupAddress}
                onChange={(event) => updateField("pickupAddress", event.target.value)}
                placeholder={copy.pickupAddressPlaceholder}
                error={errors.pickupAddress}
                disabled={formDisabled}
                maxLength={500}
                containerClassName="md:col-span-2"
              />

              <div className="space-y-2 md:col-span-2">
                <Label
                  className={cn(
                    "text-sm font-medium text-[#1C3A34]",
                    errors.pickupCoordinates && "text-red-700",
                  )}
                >
                  {copy.pickupLocation}
                </Label>
                <LazyCoordinateMapPicker
                  latitude={pickupCoordinates.latitude}
                  longitude={pickupCoordinates.longitude}
                  onCoordinatesChange={updatePickupCoordinates}
                  visible={!loading}
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

              <AdminSelectField
                id="dropoff-saved-location"
                label={copy.dropoffSavedLocation}
                value={dropoffLocationId || null}
                onValueChange={handleDropoffLocationChange}
                items={dropoffLocationItems}
                placeholder={copy.dropoffSavedLocationPlaceholder}
                optional
                optionalLabel={copy.optional}
                disabled={formDisabled || dropoffLocationItems.length === 0}
                hint={
                  dropoffLocationItems.length === 0
                    ? copy.noDropoffLocations
                    : copy.savedLocationHint
                }
                containerClassName="md:col-span-2"
              />

              <AdminTextField
                id="dropoff-address"
                label={copy.dropoffAddress}
                value={form.dropoffAddress}
                onChange={(event) => updateField("dropoffAddress", event.target.value)}
                placeholder={copy.dropoffAddressPlaceholder}
                error={errors.dropoffAddress}
                disabled={formDisabled}
                maxLength={500}
                containerClassName="md:col-span-2"
              />

              <div className="space-y-2 md:col-span-2">
                <Label
                  className={cn(
                    "text-sm font-medium text-[#1C3A34]",
                    errors.dropoffCoordinates && "text-red-700",
                  )}
                >
                  {copy.dropoffLocation}
                </Label>
                <LazyCoordinateMapPicker
                  latitude={dropoffCoordinates.latitude}
                  longitude={dropoffCoordinates.longitude}
                  onCoordinatesChange={updateDropoffCoordinates}
                  visible={!loading}
                  defaultCenter={dropoffMapCenter}
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

              <AdminSelectField
                id="vehicle-type"
                label={copy.vehicleType}
                value={form.vehicleTypeId || null}
                onValueChange={updateVehicleTypeId}
                items={vehicleTypeItems}
                placeholder={copy.vehicleTypePlaceholder}
                optional
                optionalLabel={copy.optional}
                disabled={formDisabled}
              />
              <AdminSelectField
                id="vehicle-class"
                label={copy.vehicleClass}
                value={form.vehicleClassId || null}
                onValueChange={(value) => updateField("vehicleClassId", value)}
                items={vehicleClassItems}
                placeholder={copy.vehicleClassPlaceholder}
                optional
                optionalLabel={copy.optional}
                disabled={formDisabled || !form.vehicleTypeId}
                error={errors.vehicleClassId}
              />
              <AdminSelectField
                id="region"
                label={copy.region}
                value={form.regionId || null}
                onValueChange={(value) => updateField("regionId", value)}
                items={regions}
                placeholder={copy.regionPlaceholder}
                optional
                optionalLabel={copy.optional}
                disabled={formDisabled}
                containerClassName="md:col-span-2"
              />
              <div className="space-y-3 md:col-span-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <AdminTextField
                    id="passenger-count"
                    label={copy.passengerCount}
                    type="number"
                    min={1}
                    max={passengerMax}
                    value={form.passengerCount}
                    onChange={(event) => updateField("passengerCount", event.target.value)}
                    error={errors.passengerCount}
                    disabled={formDisabled}
                  />
                  <AdminDatePicker
                    id="scheduled-date"
                    label={copy.scheduledDate}
                    placeholder={copy.pickDate}
                    clearLabel={copy.clearDate}
                    todayLabel={copy.today}
                    value={scheduledDate}
                    minDate={startOfDay(new Date())}
                    disabled={formDisabled}
                    onChange={handleScheduledDateChange}
                  />
                  <AdminTimePicker
                    id="scheduled-time"
                    label={copy.scheduledTime}
                    placeholder={copy.pickTime}
                    clearLabel={copy.clearTime}
                    hourLabel={copy.hour}
                    minuteLabel={copy.minute}
                    applyLabel={copy.applyTime}
                    value={scheduledTime}
                    minTime={scheduledMinTime}
                    locale={locale}
                    disabled={formDisabled || !scheduledDate}
                    onChange={handleScheduledTimeChange}
                  />
                </div>
                {errors.scheduledAt ? (
                  <p className="text-xs text-red-600">{errors.scheduledAt}</p>
                ) : (
                  <p className="text-xs leading-relaxed text-slate-500">{copy.scheduledAtHint}</p>
                )}
              </div>
              <AdminTextareaField
                id="notes"
                label={copy.notes}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder={copy.notesPlaceholder}
                optional
                optionalLabel={copy.optional}
                disabled={formDisabled}
                maxLength={1000}
                rows={4}
                containerClassName="md:col-span-2"
              />
            </div>

            <div className="flex flex-col items-end gap-2">
              {!canSubmitRequest ? (
                <p className="text-xs text-slate-500">{copy.submitDisabledNoPermission}</p>
              ) : null}
              <Button
                type="submit"
                className={adminPrimaryButtonClass}
                disabled={submitDisabled}
              >
                {submitting ? copy.submitting : copy.submit}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={adminCardClass}>
        <CardHeader className="gap-2">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4 text-[#1C3A34]" />
            {copy.recentTitle}
          </CardTitle>
          <CardDescription>{copy.recentDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">{copy.loading}</p>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">{copy.emptyTitle}</p>
              <p className="mt-1 text-sm text-slate-500">{copy.emptyDescription}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#1C3A34]">
                        <MapPin className="size-4 shrink-0 text-[#C9B87A]" />
                        <span className="truncate">{request.pickup_address}</span>
                      </div>
                      <p className="pl-6 text-sm text-slate-600">{request.dropoff_address}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-xs", statusBadgeClass(request.status))}>
                      {copy.status[request.status]}
                    </Badge>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{formatScheduledAt(request.scheduled_at, locale)}</span>
                    <span>
                      {formatMessage(copy.passengersCount, { count: request.passenger_count })}
                    </span>
                    {request.vehicle_type ? <span>{request.vehicle_type.name}</span> : null}
                    {request.vehicle_class ? <span>{request.vehicle_class.name}</span> : null}
                    {request.region ? <span>{request.region.name}</span> : null}
                    {isValidCoordinatePair(request.pickup_latitude ?? undefined, request.pickup_longitude ?? undefined) ? (
                      <span className="inline-flex items-center gap-1">
                        <Navigation className="size-3" />
                        {request.pickup_latitude?.toFixed(5)}, {request.pickup_longitude?.toFixed(5)}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
