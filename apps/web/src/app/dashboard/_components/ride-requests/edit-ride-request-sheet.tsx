"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { startOfDay } from "date-fns";
import {
  Calendar,
  ChevronDown,
  Loader2,
  MapPin,
  Route,
  User,
  Car,
  FileText,
} from "lucide-react";
import type { RideRequest, RideRequestLocationOption } from "@smart-dispatch/types";
import {
  AdminFormSection,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  buildRideRequestNotes,
  buildVehicleTypeLabel,
  combineScheduledDateTime,
  filterLocationsByRegion,
  buildDropoffLocationItems,
  getAdditionalInformation,
  getMinTimeForDate,
  getPassengerContactDetails,
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

const LazyRideRequestRouteMap = dynamic(
  () =>
    import("./ride-request-route-map").then((mod) => mod.RideRequestRouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-slate-200/80 bg-[#e8eef0] dark:border-border dark:bg-muted/40">
        <Loader2 className="size-5 animate-spin text-[#C9B87A]" />
      </div>
    ),
  },
);

type EditRideRequestSheetProps = {
  request: RideRequest | null;
  open: boolean;
  locale: string;
  onOpenChange: (open: boolean) => void;
  onUpdated: (request: RideRequest) => void;
};

function LocationModeSwitch({
  savedLabel,
  customLabel,
  useCustom,
  onSelectSaved,
  onSelectCustom,
  disabled,
}: {
  savedLabel: string;
  customLabel: string;
  useCustom: boolean;
  onSelectSaved: () => void;
  onSelectCustom: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50/90 p-0.5 dark:border-border dark:bg-muted/40"
      role="group"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onSelectSaved}
        className={cn(
          "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
          !useCustom
            ? "bg-white text-[#1C3A34] shadow-sm dark:bg-accent dark:text-foreground"
            : "text-slate-500 hover:text-slate-700 dark:text-muted-foreground",
        )}
      >
        {savedLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelectCustom}
        className={cn(
          "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
          useCustom
            ? "bg-white text-[#1C3A34] shadow-sm dark:bg-accent dark:text-foreground"
            : "text-slate-500 hover:text-slate-700 dark:text-muted-foreground",
        )}
      >
        {customLabel}
      </button>
    </div>
  );
}

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
  const [passengerName, setPassengerName] = useState("");
  const [passengerMobile, setPassengerMobile] = useState("");
  const [additionalInformation, setAdditionalInformation] = useState("");
  const [pickupCoordinates, setPickupCoordinates] = useState<CoordinateState>({});
  const [dropoffCoordinates, setDropoffCoordinates] = useState<CoordinateState>({});
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [dropoffLocationId, setDropoffLocationId] = useState("");
  const [useCustomPickup, setUseCustomPickup] = useState(false);
  const [useCustomDropoff, setUseCustomDropoff] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [scheduledTime, setScheduledTime] = useState<TimeValue | undefined>();
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [returnTime, setReturnTime] = useState<TimeValue | undefined>();
  const [errors, setErrors] = useState<RideRequestFieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<RideRequestVehicleTypeOption[]>([]);
  const [regions, setRegions] = useState<Array<{ label: string; value: string }>>([]);
  const [pickupLocations, setPickupLocations] = useState<RideRequestLocationOption[]>([]);
  const [dropoffLocations, setDropoffLocations] = useState<RideRequestLocationOption[]>([]);
  const [routePreviewOpen, setRoutePreviewOpen] = useState(true);
  const [routeCalculating, setRouteCalculating] = useState(false);

  // Return window is only for at-contract-end (service-window) contracts, not per-trip.
  const showReturnSchedule = request?.contract?.billing_interval === "at_contract_end";

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
        const options = await fetchRideRequestFormOptions(
          locale,
          currentRequest.region_id ?? undefined,
        );
        if (cancelled) return;

        setVehicleTypes(options.vehicle_types);
        setRegions(options.regions.map((region) => ({ label: region.name, value: region.id })));
        setPickupLocations(options.pickup_locations);
        setDropoffLocations(options.dropoff_locations);
        setForm(buildInitialForm(currentRequest));

        const contact = getPassengerContactDetails(currentRequest.notes);
        setPassengerName(contact.passengerName);
        setPassengerMobile(contact.mobileNumber);
        setAdditionalInformation(getAdditionalInformation(currentRequest.notes));

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
        const returnSchedule = splitScheduledDateTime(currentRequest.scheduled_return_at);
        setReturnDate(returnSchedule.date);
        setReturnTime(returnSchedule.time);
        setRoutePreviewOpen(true);
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

  useEffect(() => {
    if (!open || !form?.regionId) {
      return;
    }

    let cancelled = false;

    async function reloadLocations() {
      try {
        const options = await fetchRideRequestFormOptions(locale, form?.regionId || undefined);
        if (cancelled) return;
        setPickupLocations(options.pickup_locations);
        setDropoffLocations(options.dropoff_locations);
      } catch {
        // Keep previously loaded locations if refresh fails.
      }
    }

    void reloadLocations();
    return () => {
      cancelled = true;
    };
  }, [form?.regionId, locale, open]);

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

  const regionPickupLocations = useMemo(
    () => filterLocationsByRegion(pickupLocations, form?.regionId ?? ""),
    [form?.regionId, pickupLocations],
  );

  const regionDropoffLocations = useMemo(
    () => filterLocationsByRegion(dropoffLocations, form?.regionId ?? ""),
    [form?.regionId, dropoffLocations],
  );

  const pickupLocationItems = useMemo(
    () =>
      regionPickupLocations.map((location) => ({
        label: location.name,
        value: location.id,
      })),
    [regionPickupLocations],
  );

  const dropoffLocationItems = useMemo(
    () =>
      buildDropoffLocationItems(
        regionDropoffLocations,
        pickupLocations,
        pickupLocationId,
        useCustomPickup,
        copy.pickupTag,
      ),
    [
      copy.pickupTag,
      pickupLocationId,
      pickupLocations,
      regionDropoffLocations,
      useCustomPickup,
    ],
  );

  const showPickupBackup = pickupLocationItems.length === 0 || useCustomPickup;
  const showDropoffBackup = dropoffLocationItems.length === 0 || useCustomDropoff;
  const scheduledMinTime = useMemo(() => getMinTimeForDate(scheduledDate), [scheduledDate]);
  const returnMinTime = useMemo(() => {
    if (!returnDate || !scheduledDate || !scheduledTime) return undefined;
    if (startOfDay(returnDate).getTime() !== startOfDay(scheduledDate).getTime()) {
      return undefined;
    }
    return { hour: scheduledTime.hour, minute: scheduledTime.minute };
  }, [returnDate, scheduledDate, scheduledTime]);
  const passengerMax = selectedVehicleType?.passenger_capacity ?? 50;
  const hasRouteCoordinates = useMemo(
    () =>
      isValidCoordinatePair(pickupCoordinates.latitude, pickupCoordinates.longitude) &&
      isValidCoordinatePair(dropoffCoordinates.latitude, dropoffCoordinates.longitude),
    [
      dropoffCoordinates.latitude,
      dropoffCoordinates.longitude,
      pickupCoordinates.latitude,
      pickupCoordinates.longitude,
    ],
  );

  useEffect(() => {
    if (hasRouteCoordinates) {
      setRoutePreviewOpen(true);
    } else {
      setRouteCalculating(false);
    }
  }, [hasRouteCoordinates]);

  function updateField<K extends keyof RideRequestFormState>(key: K, value: RideRequestFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function clearError(key: keyof RideRequestFieldErrors) {
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

    const nextPickupAddress = buildLocationAddress(location);
    const nextRegionId = form.regionId || location.region_id;
    const clearDropoff = dropoffLocationId === locationId;

    setPickupLocationId(locationId);
    setUseCustomPickup(false);
    setPickupCoordinates({ latitude: location.latitude, longitude: location.longitude });
    setForm({
      ...form,
      pickupAddress: nextPickupAddress,
      regionId: nextRegionId,
      dropoffAddress: clearDropoff ? "" : form.dropoffAddress,
    });
    if (clearDropoff) {
      setDropoffLocationId("");
      setDropoffCoordinates({});
    }
    clearError("pickupSavedLocation");
    clearError("pickupAddress");
    clearError("pickupCoordinates");
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
    clearError("dropoffSavedLocation");
    clearError("dropoffAddress");
    clearError("dropoffCoordinates");
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

    if (!passengerName.trim()) {
      nextErrors.passengerName = copy.errors.passengerNameRequired;
    }
    if (!passengerMobile.trim()) {
      nextErrors.passengerMobile = copy.errors.passengerMobileRequired;
    }

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
    } else if (passengerCount > passengerMax) {
      nextErrors.passengerCount = formatMessage(copy.errors.passengerExceedsCapacity, {
        capacity: String(passengerMax),
      });
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

    let scheduledReturnAt: Date | null = null;
    if (showReturnSchedule) {
      const hasReturnDate = Boolean(returnDate);
      const hasReturnTime = Boolean(returnTime);
      if (hasReturnDate !== hasReturnTime) {
        nextErrors.scheduledReturnAt = copy.errors.scheduledReturnIncomplete;
      } else if (hasReturnDate && hasReturnTime && scheduledDate && scheduledTime) {
        const startMinutes = scheduledTime.hour * 60 + scheduledTime.minute;
        const endMinutes = returnTime!.hour * 60 + returnTime!.minute;
        const startDay = startOfDay(scheduledDate).getTime();
        const endDay = startOfDay(returnDate!).getTime();
        if (endDay < startDay || (endDay === startDay && endMinutes < startMinutes)) {
          nextErrors.scheduledReturnAt = copy.errors.scheduledReturnBeforeStart;
        } else {
          scheduledReturnAt = combineScheduledDateTime(returnDate, returnTime);
        }
      } else if (request.scheduled_return_at && !hasReturnDate && !hasReturnTime) {
        scheduledReturnAt = null;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    try {
      const combinedSchedule = combineScheduledDateTime(scheduledDate, scheduledTime);
      const notes = buildRideRequestNotes({
        passengerName,
        mobileNumber: passengerMobile,
        additionalInformation,
      });

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
        scheduled_return_at: showReturnSchedule
          ? scheduledReturnAt?.toISOString() ?? null
          : request.scheduled_return_at,
        notes,
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

  const busy = loading || submitting;

  return (
    <Sheet open={open} onOpenChange={(next) => !submitting && onOpenChange(next)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl"
      >
        <SheetHeader className="border-b border-slate-200/80 px-6 py-5 dark:border-border">
          <SheetTitle className={adminHeadingClass}>{historyCopy.editTitle}</SheetTitle>
          <SheetDescription>{historyCopy.editDescription}</SheetDescription>
          {request?.edit_deadline_at ? (
            <p className="pt-1 text-xs text-slate-500 dark:text-muted-foreground">
              {formatMessage(historyCopy.policyEditDeadline, {
                time: new Date(request.edit_deadline_at).toLocaleString(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
          ) : null}
        </SheetHeader>

        {!request?.can_edit ? (
          <div className="px-6 py-8 text-sm text-slate-500 dark:text-muted-foreground">
            {historyCopy.notEditable}
          </div>
        ) : form ? (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void handleSubmit(event)}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#f8fafb]/70 px-4 py-5 sm:px-6 dark:bg-background">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 className="size-4 animate-spin text-[#C9B87A]" />
                  {copy.loading}
                </div>
              ) : (
                <>
                  <AdminFormSection
                    title={copy.sectionContact}
                    description={copy.sectionContactDescription}
                    icon={User}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AdminTextField
                        id="edit-passenger-name"
                        label={copy.passengerName}
                        value={passengerName}
                        onChange={(event) => {
                          setPassengerName(event.target.value);
                          clearError("passengerName");
                        }}
                        placeholder={copy.passengerNamePlaceholder}
                        error={errors.passengerName}
                        disabled={busy}
                        required
                      />
                      <AdminTextField
                        id="edit-passenger-mobile"
                        label={copy.passengerMobile}
                        type="tel"
                        value={passengerMobile}
                        onChange={(event) => {
                          setPassengerMobile(event.target.value);
                          clearError("passengerMobile");
                        }}
                        placeholder={copy.passengerMobilePlaceholder}
                        hint={copy.passengerMobileHint}
                        error={errors.passengerMobile}
                        disabled={busy}
                        required
                      />
                    </div>
                  </AdminFormSection>

                  <AdminFormSection
                    title={copy.sectionRoute}
                    description={copy.sectionRouteDescription}
                    icon={MapPin}
                  >
                    <AdminSelectField
                      id="edit-region"
                      label={copy.region}
                      value={form.regionId || null}
                      onValueChange={(value) => {
                        updateField("regionId", value);
                        setPickupLocationId("");
                        setDropoffLocationId("");
                        setPickupCoordinates({});
                        setDropoffCoordinates({});
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                regionId: value,
                                pickupAddress: "",
                                dropoffAddress: "",
                              }
                            : current,
                        );
                      }}
                      items={regions}
                      placeholder={copy.regionPlaceholder}
                      optional
                      optionalLabel={copy.optional}
                      disabled={busy}
                    />

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase dark:text-muted-foreground">
                          {copy.pickupLocation}
                        </p>
                        {pickupLocationItems.length > 0 ? (
                          <LocationModeSwitch
                            savedLabel={copy.locationModeSaved}
                            customLabel={copy.locationModeCustom}
                            useCustom={useCustomPickup}
                            disabled={busy}
                            onSelectSaved={() => {
                              setUseCustomPickup(false);
                              setPickupLocationId("");
                              updateField("pickupAddress", "");
                              setPickupCoordinates({});
                            }}
                            onSelectCustom={() => {
                              setUseCustomPickup(true);
                              setPickupLocationId("");
                              updateField("pickupAddress", "");
                              setPickupCoordinates({});
                            }}
                          />
                        ) : null}
                      </div>

                      {!showPickupBackup ? (
                        <AdminSelectField
                          id="edit-pickup-saved"
                          label={copy.pickupSavedLocation}
                          value={pickupLocationId || null}
                          onValueChange={(value) =>
                            value ? applyPickupLocation(value) : setPickupLocationId("")
                          }
                          items={pickupLocationItems}
                          placeholder={copy.pickupSavedLocationPlaceholder}
                          disabled={busy}
                          error={errors.pickupSavedLocation}
                        />
                      ) : (
                        <div className="space-y-3">
                          {pickupLocationItems.length === 0 ? (
                            <p className="text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
                              {copy.noPickupLocations}
                            </p>
                          ) : (
                            <p className="text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
                              {copy.backupLocationHint}
                            </p>
                          )}
                          <AdminTextField
                            id="edit-pickup-address"
                            label={copy.pickupAddress}
                            value={form.pickupAddress}
                            onChange={(event) => updateField("pickupAddress", event.target.value)}
                            placeholder={copy.pickupAddressPlaceholder}
                            error={errors.pickupAddress}
                            disabled={busy}
                          />
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#1C3A34] dark:text-foreground">
                              {copy.pickupLocation}
                            </Label>
                            <LazyCoordinateMapPicker
                              latitude={pickupCoordinates.latitude}
                              longitude={pickupCoordinates.longitude}
                              onCoordinatesChange={(latitude, longitude) => {
                                setPickupCoordinates({ latitude, longitude });
                                clearError("pickupCoordinates");
                              }}
                              visible={open && !loading}
                              title={copy.pickupLocation}
                              hint={copy.mapPickerHint}
                              loadingLabel={copy.mapLoading}
                              emptyLabel={copy.mapEmpty}
                              recenterLabel={copy.mapRecenter}
                            />
                            {errors.pickupCoordinates ? (
                              <p className="text-xs text-red-600 dark:text-red-300">
                                {errors.pickupCoordinates}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-border">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] font-bold tracking-[0.14em] text-slate-500 uppercase dark:text-muted-foreground">
                          {copy.dropoffLocation}
                        </p>
                        {dropoffLocationItems.length > 0 ? (
                          <LocationModeSwitch
                            savedLabel={copy.locationModeSaved}
                            customLabel={copy.locationModeCustom}
                            useCustom={useCustomDropoff}
                            disabled={busy}
                            onSelectSaved={() => {
                              setUseCustomDropoff(false);
                              setDropoffLocationId("");
                              updateField("dropoffAddress", "");
                              setDropoffCoordinates({});
                            }}
                            onSelectCustom={() => {
                              setUseCustomDropoff(true);
                              setDropoffLocationId("");
                              updateField("dropoffAddress", "");
                              setDropoffCoordinates({});
                            }}
                          />
                        ) : null}
                      </div>

                      {!showDropoffBackup ? (
                        <AdminSelectField
                          id="edit-dropoff-saved"
                          label={copy.dropoffSavedLocation}
                          value={dropoffLocationId || null}
                          onValueChange={(value) =>
                            value ? applyDropoffLocation(value) : setDropoffLocationId("")
                          }
                          items={dropoffLocationItems}
                          placeholder={copy.dropoffSavedLocationPlaceholder}
                          disabled={busy}
                          error={errors.dropoffSavedLocation}
                        />
                      ) : (
                        <div className="space-y-3">
                          {dropoffLocationItems.length === 0 ? (
                            <p className="text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
                              {copy.noDropoffLocations}
                            </p>
                          ) : (
                            <p className="text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
                              {copy.backupLocationHint}
                            </p>
                          )}
                          <AdminTextField
                            id="edit-dropoff-address"
                            label={copy.dropoffAddress}
                            value={form.dropoffAddress}
                            onChange={(event) => updateField("dropoffAddress", event.target.value)}
                            placeholder={copy.dropoffAddressPlaceholder}
                            error={errors.dropoffAddress}
                            disabled={busy}
                          />
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-[#1C3A34] dark:text-foreground">
                              {copy.dropoffLocation}
                            </Label>
                            <LazyCoordinateMapPicker
                              latitude={dropoffCoordinates.latitude}
                              longitude={dropoffCoordinates.longitude}
                              onCoordinatesChange={(latitude, longitude) => {
                                setDropoffCoordinates({ latitude, longitude });
                                clearError("dropoffCoordinates");
                              }}
                              visible={open && !loading}
                              title={copy.dropoffLocation}
                              hint={copy.mapPickerHint}
                              loadingLabel={copy.mapLoading}
                              emptyLabel={copy.mapEmpty}
                              recenterLabel={copy.mapRecenter}
                            />
                            {errors.dropoffCoordinates ? (
                              <p className="text-xs text-red-600 dark:text-red-300">
                                {errors.dropoffCoordinates}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>

                    {hasRouteCoordinates ? (
                      <Collapsible
                        open={routePreviewOpen}
                        onOpenChange={setRoutePreviewOpen}
                        className="rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-border dark:bg-muted/30"
                      >
                        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3.5 text-left transition-colors hover:bg-white/70 dark:hover:bg-white/[0.04]">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="rounded-lg bg-[#1C3A34]/8 p-2 text-[#1C3A34] dark:bg-accent dark:text-[var(--brand-accent)]">
                              <Route className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#1C3A34] dark:text-foreground">
                                {copy.routePreviewTitle}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                                {routeCalculating
                                  ? historyCopy.detailMapLoading
                                  : copy.routePreviewDescription}
                              </p>
                            </div>
                          </div>
                          {routeCalculating ? (
                            <Loader2 className="size-4 shrink-0 animate-spin text-[#C9B87A]" />
                          ) : (
                            <ChevronDown
                              className={cn(
                                "size-4 shrink-0 text-slate-400 transition-transform",
                                routePreviewOpen && "rotate-180",
                              )}
                            />
                          )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="border-t border-slate-200/80 px-4 py-4 dark:border-border">
                          <LazyRideRequestRouteMap
                            visible={routePreviewOpen}
                            locale={locale}
                            height={280}
                            pickupLatitude={pickupCoordinates.latitude}
                            pickupLongitude={pickupCoordinates.longitude}
                            dropoffLatitude={dropoffCoordinates.latitude}
                            dropoffLongitude={dropoffCoordinates.longitude}
                            pickupName={form.pickupAddress || historyCopy.detailPickupPoint}
                            dropoffName={form.dropoffAddress || historyCopy.detailDropoffPoint}
                            pickupTypeLabel={historyCopy.detailPickupPoint}
                            dropoffTypeLabel={historyCopy.detailDropoffPoint}
                            loadingLabel={historyCopy.detailMapLoading}
                            calculatingLabel={historyCopy.detailMapLoading}
                            emptyLabel={historyCopy.detailMapEmpty}
                            recenterLabel={historyCopy.detailMapRecenter}
                            distanceLabel={historyCopy.detailMapDistance}
                            durationLabel={historyCopy.detailMapDuration}
                            straightLineLabel={historyCopy.detailMapStraightLine}
                            distanceUnitKm={historyCopy.detailMapDistanceUnitKm}
                            distanceUnitM={historyCopy.detailMapDistanceUnitM}
                            onRouteLoadingChange={setRouteCalculating}
                          />
                        </CollapsibleContent>
                      </Collapsible>
                    ) : (
                      <div className="flex items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3.5 dark:border-border dark:bg-muted/20">
                        <div className="rounded-lg bg-[#1C3A34]/8 p-2 text-[#1C3A34] dark:bg-accent dark:text-[var(--brand-accent)]">
                          <Route className="size-4" />
                        </div>
                        <div className="min-w-0 pt-0.5">
                          <p className="text-sm font-semibold text-[#1C3A34] dark:text-foreground">
                            {copy.routePreviewTitle}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">
                            {copy.routePreviewHint}
                          </p>
                        </div>
                      </div>
                    )}
                  </AdminFormSection>

                  <AdminFormSection
                    title={copy.sectionTripDetails}
                    description={copy.sectionTripDetailsDescription}
                    icon={Car}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AdminSelectField
                        id="edit-vehicle-type"
                        label={copy.vehicleType}
                        value={form.vehicleTypeId || null}
                        onValueChange={(value) => {
                          updateField("vehicleTypeId", value);
                          updateField("vehicleClassId", "");
                        }}
                        items={vehicleTypeItems}
                        placeholder={copy.vehicleTypePlaceholder}
                        optional
                        optionalLabel={copy.optional}
                        disabled={busy}
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
                        disabled={busy || !form.vehicleTypeId}
                        error={errors.vehicleClassId}
                      />
                    </div>

                    <AdminTextField
                      id="edit-passengers"
                      label={copy.passengerCount}
                      type="number"
                      min={1}
                      max={passengerMax}
                      value={form.passengerCount}
                      onChange={(event) => updateField("passengerCount", event.target.value)}
                      hint={
                        selectedVehicleType?.passenger_capacity
                          ? formatMessage(copy.vehicleTypeOption, {
                              name: selectedVehicleType.name,
                              capacity: String(selectedVehicleType.passenger_capacity),
                            })
                          : undefined
                      }
                      error={errors.passengerCount}
                      disabled={busy}
                    />
                  </AdminFormSection>

                  <AdminFormSection
                    title={copy.sectionSchedule}
                    description={copy.sectionScheduleDescription}
                    icon={Calendar}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <AdminDatePicker
                        id="edit-scheduled-date"
                        label={copy.scheduledDate}
                        placeholder={copy.pickDate}
                        clearLabel={copy.clearDate}
                        todayLabel={copy.today}
                        value={scheduledDate}
                        minDate={startOfDay(new Date())}
                        disabled={busy}
                        onChange={(date) => {
                          setScheduledDate(date);
                          setScheduledTime(undefined);
                          clearError("scheduledAt");
                          if (
                            date &&
                            returnDate &&
                            startOfDay(returnDate).getTime() < startOfDay(date).getTime()
                          ) {
                            setReturnDate(undefined);
                            setReturnTime(undefined);
                          }
                        }}
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
                        disabled={busy || !scheduledDate}
                        onChange={(value) => {
                          setScheduledTime(value);
                          clearError("scheduledAt");
                        }}
                      />
                    </div>
                    {errors.scheduledAt ? (
                      <p className="text-xs text-red-600 dark:text-red-300">{errors.scheduledAt}</p>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-muted-foreground">
                        {copy.scheduledAtHint}
                      </p>
                    )}

                    {showReturnSchedule ? (
                      <div className="space-y-3 border-t border-slate-100 pt-5 dark:border-border">
                        <p className="text-xs font-semibold text-[#1C3A34] dark:text-foreground">
                          {copy.scheduledReturnAt}
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <AdminDatePicker
                            id="edit-return-date"
                            label={copy.returnDate}
                            placeholder={copy.pickDate}
                            clearLabel={copy.clearDate}
                            todayLabel={copy.today}
                            value={returnDate}
                            minDate={scheduledDate ?? startOfDay(new Date())}
                            disabled={busy || !scheduledDate}
                            onChange={(date) => {
                              setReturnDate(date);
                              setReturnTime(undefined);
                              clearError("scheduledReturnAt");
                            }}
                          />
                          <AdminTimePicker
                            id="edit-return-time"
                            label={copy.returnTime}
                            placeholder={copy.pickTime}
                            clearLabel={copy.clearTime}
                            hourLabel={copy.hour}
                            minuteLabel={copy.minute}
                            periodLabel={copy.period}
                            amLabel={copy.am}
                            pmLabel={copy.pm}
                            applyLabel={copy.applyTime}
                            value={returnTime}
                            minTime={returnMinTime}
                            locale={locale}
                            hour12
                            disabled={busy || !returnDate}
                            onChange={(value) => {
                              setReturnTime(value);
                              clearError("scheduledReturnAt");
                            }}
                          />
                        </div>
                        {errors.scheduledReturnAt ? (
                          <p className="text-xs text-red-600 dark:text-red-300">
                            {errors.scheduledReturnAt}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </AdminFormSection>

                  <AdminFormSection
                    title={copy.sectionNotes}
                    description={copy.sectionNotesDescription}
                    icon={FileText}
                  >
                    <AdminTextareaField
                      id="edit-additional-information"
                      label={copy.additionalInformation}
                      value={additionalInformation}
                      onChange={(event) => setAdditionalInformation(event.target.value)}
                      placeholder={copy.additionalInformationPlaceholder}
                      hint={copy.additionalInformationHint}
                      optional
                      optionalLabel={copy.optional}
                      disabled={busy}
                      maxLength={1000}
                      rows={4}
                    />
                  </AdminFormSection>
                </>
              )}
            </div>

            <SheetFooter className="border-t border-slate-200/80 bg-white px-6 py-4 dark:border-border dark:bg-card">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => onOpenChange(false)}
              >
                {historyCopy.rating.cancel}
              </Button>
              <Button
                type="submit"
                className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                disabled={busy}
              >
                {submitting ? historyCopy.saving : historyCopy.saveChanges}
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
