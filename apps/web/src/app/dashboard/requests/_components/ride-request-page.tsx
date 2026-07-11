"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { startOfDay } from "date-fns";
import { CalendarClock, Car, Check, FileText, MapPin, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RideRequestContractOption, RideRequestLocationOption } from "@smart-dispatch/types";
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
import {
  buildLocationAddress,
  buildVehicleTypeLabel,
  combineScheduledDateTime,
  resolveTripContract,
  emptyRideRequestForm,
  filterLocationsByRegion,
  buildDropoffLocationItems,
  getMinTimeForDate,
  isTimeBeforeMin,
  type BillingMode,
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
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  DEFAULT_MAP_CENTER,
  isValidCoordinatePair,
} from "@/lib/map/coordinates";
import {
  createRideRequest,
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

type CustomerRequestsCopy = ReturnType<typeof getCustomerRequestsMessages>;

type RideRequestStepId = "billing" | "route" | "trip" | "notes";

type RideRequestStep = {
  id: RideRequestStepId;
  title: string;
  description: string;
  icon: LucideIcon;
};

type VerticalStepperProps = {
  steps: RideRequestStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
};

function VerticalStepper({ steps, currentStep, onStepClick }: VerticalStepperProps) {
  return (
    <nav aria-label="Request progress" className="w-full lg:max-w-xs">
      <ol className="space-y-0">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isUpcoming = index > currentStep;
          const StepIcon = step.icon;

          return (
            <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
              {index < steps.length - 1 ? (
                <span
                  className={cn(
                    "absolute left-[15px] top-8 bottom-0 w-px",
                    isComplete ? "bg-[#1C3A34]/30" : "bg-slate-200",
                  )}
                  aria-hidden
                />
              ) : null}
              <button
                type="button"
                disabled={isUpcoming}
                onClick={() => onStepClick(index)}
                className={cn(
                  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors",
                  isComplete && "border-[#1C3A34] bg-[#1C3A34] text-white",
                  isCurrent && "border-[#1C3A34] bg-white text-[#1C3A34] shadow-sm",
                  isUpcoming && "border-slate-200 bg-white text-slate-400",
                  !isUpcoming && "cursor-pointer hover:opacity-90",
                  isUpcoming && "cursor-default",
                )}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isComplete ? <Check className="size-4" /> : index + 1}
              </button>
              <div className={cn("min-w-0 flex-1 pt-0.5", isUpcoming && "opacity-55")}>
                <div className="flex items-center gap-2">
                  <StepIcon className="size-3.5 shrink-0 text-[#1C3A34]/70" aria-hidden />
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isCurrent ? "text-[#1C3A34]" : "text-slate-700",
                    )}
                  >
                    {step.title}
                  </p>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
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
          key={`${labels.id}-saved-location-${locationId || "empty"}-${locationItems.map((item) => item.value).join(",")}`}
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
  const [billingMode, setBillingMode] = useState<BillingMode>("one_time");
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
  const [contracts, setContracts] = useState<RideRequestContractOption[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = useMemo<RideRequestStep[]>(() => {
    const nextSteps: RideRequestStep[] = [];

    if (contracts.length > 0) {
      nextSteps.push({
        id: "billing",
        title: copy.stepBilling,
        description: copy.sectionBillingDescription,
        icon: FileText,
      });
    }

    nextSteps.push(
      {
        id: "route",
        title: copy.stepRoute,
        description: copy.sectionRouteDescription,
        icon: MapPin,
      },
      {
        id: "trip",
        title: copy.stepTrip,
        description: copy.sectionTripDetailsDescription,
        icon: Car,
      },
      {
        id: "notes",
        title: copy.stepNotes,
        description: copy.sectionNotesDescription,
        icon: CalendarClock,
      },
    );

    return nextSteps;
  }, [contracts.length, copy]);

  const currentStepId = steps[currentStep]?.id ?? "route";
  const isLastStep = currentStep === steps.length - 1;

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
      buildDropoffLocationItems(
        filterLocationsByRegion(dropoffLocations, form.regionId),
        pickupLocations,
        pickupLocationId,
        useCustomPickup,
        copy.pickupTag,
      ),
    [
      copy.pickupTag,
      dropoffLocations,
      form.regionId,
      pickupLocations,
      pickupLocationId,
      useCustomPickup,
    ],
  );

  const showPickupBackup = pickupLocationItems.length === 0 || useCustomPickup;
  const showDropoffBackup = dropoffLocationItems.length === 0 || useCustomDropoff;

  const tripContractResolution = useMemo(
    () =>
      resolveTripContract(contracts, {
        regionId: form.regionId,
        vehicleTypeId: form.vehicleTypeId,
        vehicleClassId: form.vehicleClassId,
      }),
    [contracts, form.regionId, form.vehicleClassId, form.vehicleTypeId],
  );


  useEffect(() => {
    setCurrentStep((step) => Math.min(step, Math.max(steps.length - 1, 0)));
  }, [steps.length]);

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
        const options = await fetchRideRequestFormOptions(locale);

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
        setContracts(options.contracts);
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
        const stillValidInDropoff = dropoffLocations.some(
          (location) =>
            location.id === currentDropoffId &&
            (!value || location.region_id === value),
        );
        const stillValidAsSelectedPickup =
          currentDropoffId === pickupLocationId &&
          !useCustomPickup &&
          pickupLocations.some(
            (location) =>
              location.id === currentDropoffId &&
              (!value || location.region_id === value),
          );

        return stillValidInDropoff || stillValidAsSelectedPickup ? currentDropoffId : "";
      });
    }

    setErrors((current) => {
      const next = { ...current };
      if (current[key]) delete next[key];
      if (
        billingMode === "contract" &&
        (key === "regionId" || key === "vehicleTypeId" || key === "vehicleClassId") &&
        current.billing
      ) {
        delete next.billing;
      }
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

    if (dropoffLocationId === locationId) {
      setDropoffLocationId("");
      setForm((current) => ({ ...current, dropoffAddress: "" }));
      setDropoffCoordinates({});
    }

    setErrors((current) => {
      const next = { ...current };
      delete next.pickupAddress;
      delete next.pickupCoordinates;
      delete next.pickupSavedLocation;
      return next;
    });
  }

  function applyDropoffLocation(locationId: string) {
    const location =
      dropoffLocations.find((entry) => entry.id === locationId) ??
      pickupLocations.find((entry) => entry.id === locationId);
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
    setBillingMode("one_time");
    setPickupCoordinates({});
    setDropoffCoordinates({});
    setPickupLocationId("");
    setDropoffLocationId("");
    setUseCustomPickup(false);
    setUseCustomDropoff(false);
    setScheduledDate(undefined);
    setScheduledTime(undefined);
    setErrors({});
    setCurrentStep(0);
  }

  function collectRouteStepErrors(): RideRequestFieldErrors {
    const pickupAddress = form.pickupAddress.trim();
    const dropoffAddress = form.dropoffAddress.trim();
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

    if (billingMode === "contract" && !form.regionId) {
      nextErrors.regionId = copy.errors.regionRequired;
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

    return nextErrors;
  }

  function collectTripStepErrors(): RideRequestFieldErrors {
    const passengerCount = Number(form.passengerCount);
    const nextErrors: RideRequestFieldErrors = {};

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

    if (billingMode === "contract") {
      if (!form.vehicleTypeId) {
        nextErrors.vehicleTypeId = copy.errors.vehicleTypeRequiredForContract;
      }

      if (!form.vehicleClassId) {
        nextErrors.vehicleClassId = copy.errors.vehicleClassRequiredForContract;
      }

      if (tripContractResolution.status === "none") {
        nextErrors.billing = copy.errors.contractRequired;
      } else if (tripContractResolution.status === "ambiguous") {
        nextErrors.billing = copy.errors.contractAmbiguous;
      }
    }

    return nextErrors;
  }

  function collectStepErrors(stepId: RideRequestStepId): RideRequestFieldErrors {
    switch (stepId) {
      case "billing":
        return {};
      case "route":
        return collectRouteStepErrors();
      case "trip":
        return collectTripStepErrors();
      case "notes":
        return {
          ...collectRouteStepErrors(),
          ...collectTripStepErrors(),
        };
      default:
        return {};
    }
  }

  function goToStep(index: number) {
    if (index < 0 || index >= steps.length || index > currentStep) {
      return;
    }

    setErrors({});
    setCurrentStep(index);
  }

  function handleNext() {
    const stepErrors = collectStepErrors(currentStepId);

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    setErrors({});
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function handleBack() {
    setErrors({});
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = collectStepErrors("notes");

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);

      const routeErrors = collectRouteStepErrors();
      const tripErrors = collectTripStepErrors();

      if (Object.keys(routeErrors).length > 0) {
        const routeStepIndex = steps.findIndex((step) => step.id === "route");
        if (routeStepIndex >= 0) {
          setCurrentStep(routeStepIndex);
        }
      } else if (Object.keys(tripErrors).length > 0) {
        const tripStepIndex = steps.findIndex((step) => step.id === "trip");
        if (tripStepIndex >= 0) {
          setCurrentStep(tripStepIndex);
        }
      }

      return;
    }

    setErrors({});

    const pickupAddress = form.pickupAddress.trim();
    const dropoffAddress = form.dropoffAddress.trim();
    const passengerCount = Number(form.passengerCount);
    const matchedContractId =
      billingMode === "contract" && tripContractResolution.status === "matched"
        ? tripContractResolution.contract.id
        : null;

    setSubmitting(true);

    const combinedSchedule = combineScheduledDateTime(scheduledDate, scheduledTime);

    try {
      await createRideRequest({
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
        contract_id: matchedContractId,
      });

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
          <form onSubmit={(event) => void handleSubmit(event)}>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
              <VerticalStepper
                steps={steps}
                currentStep={currentStep}
                onStepClick={goToStep}
              />

              <div className="min-w-0 flex-1 space-y-6">
                <div className="space-y-1 border-b border-slate-100 pb-4 lg:hidden">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {formatMessage(copy.stepProgress, {
                      current: currentStep + 1,
                      total: steps.length,
                    })}
                  </p>
                  <p className="text-base font-semibold text-[#1C3A34]">
                    {steps[currentStep]?.title}
                  </p>
                </div>

                {currentStepId === "billing" ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={formDisabled}
                        onClick={() => {
                          setBillingMode("one_time");
                          setErrors((current) => {
                            if (!current.billing) return current;
                            const next = { ...current };
                            delete next.billing;
                            return next;
                          });
                        }}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-all",
                          billingMode === "one_time"
                            ? "border-[#1C3A34] bg-[#1C3A34]/5 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300",
                          formDisabled && "pointer-events-none opacity-60",
                        )}
                      >
                        <p className="text-sm font-semibold text-slate-800">{copy.billingOneTime}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          {copy.billingOneTimeDescription}
                        </p>
                      </button>
                      <button
                        type="button"
                        disabled={formDisabled}
                        onClick={() => setBillingMode("contract")}
                        className={cn(
                          "rounded-xl border p-4 text-left transition-all",
                          billingMode === "contract"
                            ? "border-[#1C3A34] bg-[#1C3A34]/5 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300",
                          formDisabled && "pointer-events-none opacity-60",
                        )}
                      >
                        <p className="text-sm font-semibold text-slate-800">{copy.billingContract}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          {copy.billingContractDescription}
                        </p>
                      </button>
                    </div>

                    {billingMode === "contract" && errors.billing ? (
                      <p className="text-sm text-red-600">{errors.billing}</p>
                    ) : null}
                  </div>
                ) : null}

                {currentStepId === "route" ? (
                  <div className="space-y-5">
                    <AdminSelectField
                      id="region"
                      label={copy.region}
                      value={form.regionId || null}
                      onValueChange={(value) => updateField("regionId", value)}
                      items={regions}
                      placeholder={copy.regionPlaceholder}
                      optional={billingMode !== "contract"}
                      optionalLabel={copy.optional}
                      disabled={formDisabled}
                      hint={copy.regionFilterHint}
                      error={errors.regionId}
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
                ) : null}

                {currentStepId === "trip" ? (
                  <div className="space-y-5 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <AdminSelectField
                        id="vehicle-type"
                        label={copy.vehicleType}
                        value={form.vehicleTypeId || null}
                        onValueChange={updateVehicleTypeId}
                        items={vehicleTypeItems}
                        placeholder={copy.vehicleTypePlaceholder}
                        optional={billingMode !== "contract"}
                        optionalLabel={copy.optional}
                        disabled={formDisabled}
                        error={errors.vehicleTypeId}
                      />
                      <AdminSelectField
                        id="vehicle-class"
                        label={copy.vehicleClass}
                        value={form.vehicleClassId || null}
                        onValueChange={(value) => updateField("vehicleClassId", value)}
                        items={vehicleClassItems}
                        placeholder={copy.vehicleClassPlaceholder}
                        optional={billingMode !== "contract"}
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

                    {billingMode === "contract" && errors.billing ? (
                      <p className="text-sm text-red-600">{errors.billing}</p>
                    ) : null}
                  </div>
                ) : null}

                {currentStepId === "notes" ? (
                  <div className="space-y-4">
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
                    />
                    <p className="text-xs leading-relaxed text-slate-500">{copy.submitHint}</p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    {!canSubmitRequest ? (
                      <p className="text-xs text-slate-500">{copy.submitDisabledNoPermission}</p>
                    ) : (
                      <p className="hidden text-xs text-slate-500 sm:block">
                        {formatMessage(copy.stepProgress, {
                          current: currentStep + 1,
                          total: steps.length,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                    {currentStep > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        disabled={formDisabled}
                        onClick={handleBack}
                      >
                        {copy.back}
                      </Button>
                    ) : null}
                    {isLastStep ? (
                      <Button
                        type="submit"
                        className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                        disabled={submitDisabled}
                      >
                        {submitting ? copy.submitting : copy.submit}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        className={cn(adminPrimaryButtonClass, "w-full sm:w-auto")}
                        disabled={formDisabled}
                        onClick={handleNext}
                      >
                        {copy.next}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
