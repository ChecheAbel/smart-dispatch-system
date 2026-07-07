"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { startOfDay } from "date-fns";
import { CalendarClock, Car, MapPin, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RideRequest, RideRequestLocationOption } from "@smart-dispatch/types";
import { useLocale, usePermission } from "@/components/shared/providers";
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
import { RecentRideRequestListItem } from "@/app/dashboard/_components/ride-requests/recent-request-list-item";
import { RideRequestDetailSheet } from "@/app/dashboard/_components/ride-requests/ride-request-detail-sheet";
import {
  buildLocationAddress,
  buildVehicleTypeLabel,
  combineScheduledDateTime,
  emptyRideRequestForm,
  filterLocationsByRegion,
  getMinTimeForDate,
  isTimeBeforeMin,
  type CoordinateState,
  type RideRequestFieldErrors,
  type RideRequestFormState,
} from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import type { CoordinateMapPickerProps } from "@/components/shared/coordinate-map-picker/coordinate-map-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  adminBadgeGoldClass,
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
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
import { USER_MY_REQUESTS_PATH } from "@/lib/auth-paths";
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

type CustomerRequestsCopy = ReturnType<typeof getCustomerRequestsMessages>;

type FormSectionProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

function FormSection({ icon: Icon, title, description, children, className }: FormSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-start gap-3">
        <div className={adminIconBoxClass}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h3 className={cn("text-sm font-bold", adminHeadingClass)}>{title}</h3>
          {description ? (
            <p className="text-xs leading-relaxed text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="pl-11">{children}</div>
    </section>
  );
}

type LocationModeSwitchProps = {
  savedLabel: string;
  customLabel: string;
  useCustom: boolean;
  onSelectSaved: () => void;
  onSelectCustom: () => void;
  disabled?: boolean;
};

function LocationModeSwitch({
  savedLabel,
  customLabel,
  useCustom,
  onSelectSaved,
  onSelectCustom,
  disabled,
}: LocationModeSwitchProps) {
  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 bg-slate-50/90 p-0.5"
      role="group"
      aria-label={savedLabel}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onSelectSaved}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
          !useCustom
            ? "bg-white text-[#1C3A34] shadow-sm"
            : "text-slate-500 hover:text-slate-700",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {savedLabel}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onSelectCustom}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
          useCustom
            ? "bg-white text-[#1C3A34] shadow-sm"
            : "text-slate-500 hover:text-slate-700",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {customLabel}
      </button>
    </div>
  );
}

type RouteStopProps = {
  variant: "pickup" | "dropoff";
  label: string;
  isLast?: boolean;
  children: ReactNode;
};

function RouteStop({ variant, label, isLast, children }: RouteStopProps) {
  return (
    <div className={cn("relative pl-8", !isLast && "pb-5")}>
      {!isLast ? (
        <span
          className="absolute left-[11px] top-7 bottom-0 w-px bg-gradient-to-b from-[#1C3A34]/25 via-[#C9B87A]/40 to-[#C9B87A]/60"
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          "absolute left-0 top-1.5 flex size-[22px] items-center justify-center rounded-full border-2 bg-white shadow-sm",
          variant === "pickup" ? "border-[#1C3A34]" : "border-[#C9B87A]",
        )}
        aria-hidden
      >
        <span
          className={cn(
            "size-2 rounded-full",
            variant === "pickup" ? "bg-[#1C3A34]" : "bg-[#C9B87A]",
          )}
        />
      </span>
      <div className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-[#f8fafb]/60 p-4 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}

type LocationStopFieldsProps = {
  copy: CustomerRequestsCopy;
  kind: "pickup" | "dropoff";
  showBackup: boolean;
  hasSavedOptions: boolean;
  locationItems: Array<{ label: string; value: string }>;
  locationId: string;
  onLocationChange: (value: string) => void;
  onEnableCustom: () => void;
  onEnableSaved: () => void;
  address: string;
  onAddressChange: (value: string) => void;
  coordinates: CoordinateState;
  onCoordinatesChange: (latitude: number, longitude: number) => void;
  errors: RideRequestFieldErrors;
  formDisabled: boolean;
  loading: boolean;
  mapDefaultCenter?: { latitude: number; longitude: number };
};

function LocationStopFields({
  copy,
  kind,
  showBackup,
  hasSavedOptions,
  locationItems,
  locationId,
  onLocationChange,
  onEnableCustom,
  onEnableSaved,
  address,
  onAddressChange,
  coordinates,
  onCoordinatesChange,
  errors,
  formDisabled,
  loading,
  mapDefaultCenter,
}: LocationStopFieldsProps) {
  const isPickup = kind === "pickup";
  const savedError = isPickup ? errors.pickupSavedLocation : errors.dropoffSavedLocation;
  const addressError = isPickup ? errors.pickupAddress : errors.dropoffAddress;
  const coordinatesError = isPickup ? errors.pickupCoordinates : errors.dropoffCoordinates;

  const labels = isPickup
    ? {
        saved: copy.pickupSavedLocation,
        savedPlaceholder: copy.pickupSavedLocationPlaceholder,
        address: copy.pickupAddress,
        addressPlaceholder: copy.pickupAddressPlaceholder,
        map: copy.pickupLocation,
        noSaved: copy.noPickupLocations,
        id: "pickup",
      }
    : {
        saved: copy.dropoffSavedLocation,
        savedPlaceholder: copy.dropoffSavedLocationPlaceholder,
        address: copy.dropoffAddress,
        addressPlaceholder: copy.dropoffAddressPlaceholder,
        map: copy.dropoffLocation,
        noSaved: copy.noDropoffLocations,
        id: "dropoff",
      };

  return (
    <div className="space-y-4">
      {hasSavedOptions ? (
        <LocationModeSwitch
          savedLabel={copy.locationModeSaved}
          customLabel={copy.locationModeCustom}
          useCustom={showBackup}
          onSelectSaved={onEnableSaved}
          onSelectCustom={onEnableCustom}
          disabled={formDisabled}
        />
      ) : (
        <p className="text-xs leading-relaxed text-slate-500">{labels.noSaved}</p>
      )}

      {!showBackup ? (
        <AdminSelectField
          id={`${labels.id}-saved-location`}
          label={labels.saved}
          value={locationId || null}
          onValueChange={onLocationChange}
          items={locationItems}
          placeholder={labels.savedPlaceholder}
          disabled={formDisabled}
          hint={copy.savedLocationHint}
          error={savedError}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-xs leading-relaxed text-slate-500">{copy.backupLocationHint}</p>
          <AdminTextField
            id={`${labels.id}-address`}
            label={labels.address}
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder={labels.addressPlaceholder}
            error={addressError}
            disabled={formDisabled}
            maxLength={500}
          />
          <div className="space-y-2">
            <Label
              className={cn(
                "text-sm font-medium text-[#1C3A34]",
                coordinatesError && "text-red-700",
              )}
            >
              {labels.map}
            </Label>
            <LazyCoordinateMapPicker
              latitude={coordinates.latitude}
              longitude={coordinates.longitude}
              onCoordinatesChange={onCoordinatesChange}
              visible={!loading}
              defaultCenter={mapDefaultCenter}
              title={labels.map}
              hint={copy.mapPickerHint}
              loadingLabel={copy.mapLoading}
              emptyLabel={copy.mapEmpty}
              recenterLabel={copy.mapRecenter}
            />
            {coordinatesError ? (
              <p className="text-xs text-red-600">{coordinatesError}</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export function RideRequestPage() {
  const { locale } = useLocale();
  const copy = getCustomerRequestsMessages(locale);
  const canSubmitRequest = usePermission("customer_requests.write");
  const [form, setForm] = useState<RideRequestFormState>(emptyRideRequestForm);
  const [pickupCoordinates, setPickupCoordinates] = useState<CoordinateState>({});
  const [dropoffCoordinates, setDropoffCoordinates] = useState<CoordinateState>({});
  const [pickupLocationId, setPickupLocationId] = useState("");
  const [dropoffLocationId, setDropoffLocationId] = useState("");
  const [useCustomPickup, setUseCustomPickup] = useState(false);
  const [useCustomDropoff, setUseCustomDropoff] = useState(false);
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
  const [detailRequest, setDetailRequest] = useState<RideRequest | null>(null);

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

  const showPickupBackup = pickupLocationItems.length === 0 || useCustomPickup;
  const showDropoffBackup = dropoffLocationItems.length === 0 || useCustomDropoff;

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
    setUseCustomPickup(false);
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
      delete next.pickupSavedLocation;
      return next;
    });
  }

  function applyDropoffLocation(locationId: string) {
    const location = dropoffLocations.find((entry) => entry.id === locationId);
    if (!location) {
      return;
    }

    setDropoffLocationId(locationId);
    setUseCustomDropoff(false);
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
      delete next.dropoffSavedLocation;
      return next;
    });
  }

  function enableCustomPickup() {
    setUseCustomPickup(true);
    setPickupLocationId("");
    setForm((current) => ({ ...current, pickupAddress: "" }));
    setPickupCoordinates({});
    setErrors((current) => {
      const next = { ...current };
      delete next.pickupSavedLocation;
      delete next.pickupAddress;
      delete next.pickupCoordinates;
      return next;
    });
  }

  function enableSavedPickup() {
    setUseCustomPickup(false);
    setPickupLocationId("");
    setForm((current) => ({ ...current, pickupAddress: "" }));
    setPickupCoordinates({});
    setErrors((current) => {
      const next = { ...current };
      delete next.pickupSavedLocation;
      delete next.pickupAddress;
      delete next.pickupCoordinates;
      return next;
    });
  }

  function enableCustomDropoff() {
    setUseCustomDropoff(true);
    setDropoffLocationId("");
    setForm((current) => ({ ...current, dropoffAddress: "" }));
    setDropoffCoordinates({});
    setErrors((current) => {
      const next = { ...current };
      delete next.dropoffSavedLocation;
      delete next.dropoffAddress;
      delete next.dropoffCoordinates;
      return next;
    });
  }

  function enableSavedDropoff() {
    setUseCustomDropoff(false);
    setDropoffLocationId("");
    setForm((current) => ({ ...current, dropoffAddress: "" }));
    setDropoffCoordinates({});
    setErrors((current) => {
      const next = { ...current };
      delete next.dropoffSavedLocation;
      delete next.dropoffAddress;
      delete next.dropoffCoordinates;
      return next;
    });
  }

  function handlePickupLocationChange(value: string) {
    if (!value) {
      setPickupLocationId("");
      setForm((current) => ({ ...current, pickupAddress: "" }));
      setPickupCoordinates({});
      return;
    }

    applyPickupLocation(value);
  }

  function handleDropoffLocationChange(value: string) {
    if (!value) {
      setDropoffLocationId("");
      setForm((current) => ({ ...current, dropoffAddress: "" }));
      setDropoffCoordinates({});
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
    setPickupCoordinates({ latitude, longitude });
    setErrors((current) => {
      if (!current.pickupCoordinates) return current;
      const next = { ...current };
      delete next.pickupCoordinates;
      return next;
    });
  }, []);

  const updateDropoffCoordinates = useCallback((latitude: number, longitude: number) => {
    setDropoffCoordinates({ latitude, longitude });
    setErrors((current) => {
      if (!current.dropoffCoordinates) return current;
      const next = { ...current };
      delete next.dropoffCoordinates;
      return next;
    });
  }, []);

  function resetFormState() {
    setForm(emptyRideRequestForm);
    setPickupCoordinates({});
    setDropoffCoordinates({});
    setPickupLocationId("");
    setDropoffLocationId("");
    setUseCustomPickup(false);
    setUseCustomDropoff(false);
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

    if (!showPickupBackup) {
      if (!pickupLocationId) {
        nextErrors.pickupSavedLocation = copy.errors.pickupSavedRequired;
      }
    } else {
      if (!pickupAddress) {
        nextErrors.pickupAddress = copy.errors.pickupRequired;
      }

      if (!isValidCoordinatePair(pickupCoordinates.latitude, pickupCoordinates.longitude)) {
        nextErrors.pickupCoordinates = copy.errors.pickupCoordinatesRequired;
      }
    }

    if (!showDropoffBackup) {
      if (!dropoffLocationId) {
        nextErrors.dropoffSavedLocation = copy.errors.dropoffSavedRequired;
      }
    } else {
      if (!dropoffAddress) {
        nextErrors.dropoffAddress = copy.errors.dropoffRequired;
      }

      if (!isValidCoordinatePair(dropoffCoordinates.latitude, dropoffCoordinates.longitude)) {
        nextErrors.dropoffCoordinates = copy.errors.dropoffCoordinatesRequired;
      }
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

      <Card className={cn(adminCardClass, "overflow-hidden")}>
        <CardHeader className="gap-2 border-b border-slate-200/80 bg-gradient-to-r from-[#f8fafb] to-white">
          <CardTitle className="flex items-center gap-2">
            <Route className="size-4 text-[#1C3A34]" />
            {copy.formTitle}
          </CardTitle>
          <CardDescription>{copy.formDescription}</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-8" onSubmit={(event) => void handleSubmit(event)}>
            <FormSection
              icon={MapPin}
              title={copy.sectionRoute}
              description={copy.sectionRouteDescription}
            >
              <div className="space-y-5">
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
                  hint={copy.regionFilterHint}
                />

                <div className="rounded-2xl border border-slate-200/80 bg-[#f8fafb]/40 p-4 sm:p-5">
                  <RouteStop variant="pickup" label={copy.pickupAddress}>
                    <LocationStopFields
                      copy={copy}
                      kind="pickup"
                      showBackup={showPickupBackup}
                      hasSavedOptions={pickupLocationItems.length > 0}
                      locationItems={pickupLocationItems}
                      locationId={pickupLocationId}
                      onLocationChange={handlePickupLocationChange}
                      onEnableCustom={enableCustomPickup}
                      onEnableSaved={enableSavedPickup}
                      address={form.pickupAddress}
                      onAddressChange={(value) => updateField("pickupAddress", value)}
                      coordinates={pickupCoordinates}
                      onCoordinatesChange={updatePickupCoordinates}
                      errors={errors}
                      formDisabled={formDisabled}
                      loading={loading}
                    />
                  </RouteStop>

                  <RouteStop variant="dropoff" label={copy.dropoffAddress} isLast>
                    <LocationStopFields
                      copy={copy}
                      kind="dropoff"
                      showBackup={showDropoffBackup}
                      hasSavedOptions={dropoffLocationItems.length > 0}
                      locationItems={dropoffLocationItems}
                      locationId={dropoffLocationId}
                      onLocationChange={handleDropoffLocationChange}
                      onEnableCustom={enableCustomDropoff}
                      onEnableSaved={enableSavedDropoff}
                      address={form.dropoffAddress}
                      onAddressChange={(value) => updateField("dropoffAddress", value)}
                      coordinates={dropoffCoordinates}
                      onCoordinatesChange={updateDropoffCoordinates}
                      errors={errors}
                      formDisabled={formDisabled}
                      loading={loading}
                      mapDefaultCenter={dropoffMapCenter}
                    />
                  </RouteStop>
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={Car}
              title={copy.sectionTripDetails}
              description={copy.sectionTripDetailsDescription}
            >
              <div className="space-y-5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 md:grid-cols-2">
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
                </div>

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
                    periodLabel={copy.period}
                    amLabel={copy.am}
                    pmLabel={copy.pm}
                    applyLabel={copy.applyTime}
                    value={scheduledTime}
                    minTime={scheduledMinTime}
                    locale={locale}
                    hour12
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
            </FormSection>

            <FormSection icon={CalendarClock} title={copy.sectionNotes} description={copy.sectionNotesDescription}>
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
                rows={3}
              />
            </FormSection>

            <div className="-mx-6 -mb-6 flex flex-col gap-3 border-t border-slate-200/80 bg-[#f8fafb]/70 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                {!canSubmitRequest ? (
                  <p className="text-xs text-slate-500">{copy.submitDisabledNoPermission}</p>
                ) : (
                  <p className="text-xs text-slate-500">{copy.submitHint}</p>
                )}
              </div>
              <Button
                type="submit"
                className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                disabled={submitDisabled}
              >
                {submitting ? copy.submitting : copy.submit}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className={cn(adminCardClass, "overflow-hidden")}>
        <CardHeader className="gap-2 border-b border-slate-200/80 bg-gradient-to-r from-[#f8fafb] to-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="size-4 text-[#1C3A34]" />
                {copy.recentTitle}
              </CardTitle>
              <CardDescription>{copy.recentDescription}</CardDescription>
            </div>
            {requests.length > 0 ? (
              <Link
                href={USER_MY_REQUESTS_PATH}
                className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-[#1C3A34] hover:bg-[#f8fafb]"
              >
                {copy.viewAllRequests}
              </Link>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-6 py-8 text-sm text-slate-500">{copy.loading}</p>
          ) : requests.length === 0 ? (
            <div className="mx-6 my-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-[#1C3A34]/8">
                <Route className="size-4 text-[#1C3A34]" />
              </div>
              <p className="text-sm font-semibold text-slate-700">{copy.emptyTitle}</p>
              <p className="mt-1 text-sm text-slate-500">{copy.emptyDescription}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {requests.map((request) => (
                <RecentRideRequestListItem
                  key={request.id}
                  request={request}
                  copy={copy}
                  locale={locale}
                  onViewDetails={setDetailRequest}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RideRequestDetailSheet
        request={detailRequest}
        open={Boolean(detailRequest)}
        locale={locale}
        onOpenChange={(open) => !open && setDetailRequest(null)}
      />
    </div>
  );
}
