"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Languages, MapPin, Navigation } from "lucide-react";
import type { Location } from "@smart-dispatch/types";
import { createLocation, fetchLocationById, updateLocation } from "@/lib/location-api";
import { fetchActiveRegions } from "@/lib/region-api";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { DEFAULT_MAP_CENTER } from "@/lib/map/coordinates";
import { LOCALE_OPTIONS } from "@/lib/locale";
import { useLocale } from "@/components/shared/providers";
import { formatMessage, getAdminLocationsMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import {
  Card,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { cn } from "@/lib/utils";
import type { CoordinateMapPickerProps } from "@/components/shared/coordinate-map-picker/coordinate-map-picker";

const LazyCoordinateMapPicker = dynamic<CoordinateMapPickerProps>(
  () =>
    import("@/components/shared/coordinate-map-picker/coordinate-map-picker").then(
      (mod) => mod.CoordinateMapPicker,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
    ),
  },
);

type LocationFormSheetMode = "create" | "edit";

type CreateLocationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: LocationFormSheetMode;
  locationId?: string | null;
  onSuccess?: () => void;
};

type LocationFormState = {
  regionId: string;
  enName: string;
  enDescription: string;
  amName: string;
  amDescription: string;
  latitude: string;
  longitude: string;
  address: string;
  isActive: boolean;
};

type FieldErrors = Partial<Record<keyof LocationFormState, string>>;

const emptyForm: LocationFormState = {
  regionId: "",
  enName: "",
  enDescription: "",
  amName: "",
  amDescription: "",
  latitude: String(DEFAULT_MAP_CENTER.latitude),
  longitude: String(DEFAULT_MAP_CENTER.longitude),
  address: "",
  isActive: true,
};

function mapLocationToForm(location: Location): LocationFormState {
  const en = location.translations?.find((translation) => translation.locale === "en");
  const am = location.translations?.find((translation) => translation.locale === "am");

  return {
    regionId: location.region_id,
    enName: en?.name ?? location.name,
    enDescription: en?.description ?? "",
    amName: am?.name ?? "",
    amDescription: am?.description ?? "",
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    address: location.address ?? "",
    isActive: location.is_active,
  };
}

function parseCoordinateInput(value: string, min: number, max: number) {
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return undefined;
  }
  return parsed;
}

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";
const selectTriggerClassName = cn(fieldClassName, "w-full");
const textareaClassName =
  "flex min-h-[88px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
      <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
        <div className={cn(adminIconBoxClass, "shrink-0")}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className={cn("text-sm font-semibold leading-snug", adminHeadingClass)}>{title}</p>
          <p className="text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      <div className="space-y-5 px-5 py-5">{children}</div>
    </Card>
  );
}

function LocalePanel({
  label,
  optional,
  children,
  variant = "primary",
}: {
  label: string;
  optional?: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border p-4",
        variant === "primary"
          ? "border-slate-200/80 bg-[#f8fafb]/70"
          : "border-dashed border-slate-200 bg-white",
      )}
    >
      <p className={cn("text-sm font-semibold", adminHeadingClass)}>
        {label}
        {optional ? (
          <span className="ml-2 text-xs font-normal text-slate-500">{optional}</span>
        ) : null}
      </p>
      {children}
    </div>
  );
}

function FieldHint({ children, error }: { children?: ReactNode; error?: string }) {
  if (error) {
    return <p className="text-xs text-red-600">{error}</p>;
  }

  if (!children) {
    return null;
  }

  return <p className="text-xs text-slate-500">{children}</p>;
}

export function CreateLocationSheet({
  open,
  onOpenChange,
  mode = "create",
  locationId = null,
  onSuccess,
}: CreateLocationSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminLocationsMessages(locale);
  const formCopy = copy.form;
  const sectionCopy = formCopy.sections;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<LocationFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Array<{ id: string; name: string }>>([]);

  const parsedLatitude = useMemo(
    () => parseCoordinateInput(form.latitude, -90, 90),
    [form.latitude],
  );
  const parsedLongitude = useMemo(
    () => parseCoordinateInput(form.longitude, -180, 180),
    [form.longitude],
  );
  const hasCoordinatePreview = parsedLatitude !== undefined && parsedLongitude !== undefined;

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function loadRegions() {
      try {
        const result = await fetchActiveRegions(locale);
        if (!cancelled) {
          setRegions(result.map((region) => ({ id: region.id, name: region.name })));
        }
      } catch {
        if (!cancelled) {
          setRegions([]);
        }
      }
    }

    void loadRegions();

    return () => {
      cancelled = true;
    };
  }, [open, locale]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      setSubmitting(false);
      setLoading(false);
      return;
    }

    if (!isEdit) {
      setForm(emptyForm);
      return;
    }

    if (!locationId) {
      return;
    }

    const editingId = locationId;
    let cancelled = false;

    async function loadLocation() {
      setLoading(true);
      setError(null);

      try {
        const location = await fetchLocationById(editingId);
        if (!cancelled) {
          setForm(mapLocationToForm(location));
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : formCopy.errors.loadFailed;
          setError(message);
          showErrorToast({
            title: toastCopy.loadFailed.title,
            description: message,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLocation();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, locationId, formCopy.errors.loadFailed, toastCopy.loadFailed.title]);

  function updateField<K extends keyof LocationFormState>(key: K, value: LocationFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
    setError(null);
  }

  const updateCoordinates = useCallback((latitude: number, longitude: number) => {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next.latitude;
      delete next.longitude;
      return next;
    });
    setError(null);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const enName = form.enName.trim();
    const amName = form.amName.trim();
    const latitude = parseCoordinateInput(form.latitude, -90, 90);
    const longitude = parseCoordinateInput(form.longitude, -180, 180);

    const nextErrors: FieldErrors = {};

    if (!form.regionId) {
      nextErrors.regionId = formCopy.errors.regionRequired;
    }

    if (!enName) {
      nextErrors.enName = formCopy.errors.enNameRequired;
    }

    if (latitude === undefined) {
      nextErrors.latitude = formCopy.errors.latitudeRequired;
    }

    if (longitude === undefined) {
      nextErrors.longitude = formCopy.errors.longitudeRequired;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const translations = [
      {
        locale: "en",
        name: enName,
        description: form.enDescription.trim() || null,
      },
    ];

    if (amName) {
      translations.push({
        locale: "am",
        name: amName,
        description: form.amDescription.trim() || null,
      });
    }

    setSubmitting(true);

    try {
      if (isEdit && locationId) {
        const location = await updateLocation(locationId, {
          region_id: form.regionId,
          translations,
          latitude,
          longitude,
          address: form.address.trim() || null,
          is_active: form.isActive,
        });
        showSuccessToast({
          title: toastCopy.updateSuccess.title,
          description: formatMessage(toastCopy.updateSuccess.description, {
            name: location.name,
          }),
        });
      } else {
        const location = await createLocation({
          region_id: form.regionId,
          translations,
          latitude: latitude!,
          longitude: longitude!,
          address: form.address.trim() || null,
          is_active: form.isActive,
        });
        showSuccessToast({
          title: toastCopy.createSuccess.title,
          description: formatMessage(toastCopy.createSuccess.description, {
            name: location.name,
          }),
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const failedMessage = isEdit ? formCopy.errors.updateFailed : formCopy.errors.createFailed;
      const message = err instanceof Error ? err.message : failedMessage;
      setError(message);
      showErrorToast({
        title: failedMessage,
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formId = "location-form-sheet";
  const enLabel = LOCALE_OPTIONS.find((option) => option.value === "en")?.label ?? "English";
  const amLabel = LOCALE_OPTIONS.find((option) => option.value === "am")?.nativeLabel ?? "Amharic";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-xl data-[side=right]:lg:max-w-2xl"
      >
        <SheetHeader className="border-b border-slate-100 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>
            {isEdit ? formCopy.editTitle : formCopy.createTitle}
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            {isEdit ? formCopy.editDescription : formCopy.createDescription}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="px-6 py-8 text-sm text-slate-500">{formCopy.loading}</div>
        ) : (
          <form id={formId} onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
            <FormSection
              icon={Languages}
              title={sectionCopy.identity}
              description={sectionCopy.identityDescription}
            >
              <div className="space-y-4">
                <LocalePanel label={enLabel}>
                  <div className="space-y-2">
                    <Label
                      htmlFor="location-en-name"
                      className={fieldErrors.enName ? "text-red-700" : undefined}
                    >
                      {formCopy.name}
                    </Label>
                    <Input
                      id="location-en-name"
                      value={form.enName}
                      onChange={(event) => updateField("enName", event.target.value)}
                      placeholder={formCopy.namePlaceholderEn}
                      className={cn(
                        "w-full",
                        fieldClassName,
                        fieldErrors.enName && fieldErrorClassName,
                      )}
                      aria-invalid={Boolean(fieldErrors.enName)}
                    />
                    <FieldHint error={fieldErrors.enName} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-en-description">{formCopy.description}</Label>
                    <textarea
                      id="location-en-description"
                      value={form.enDescription}
                      onChange={(event) => updateField("enDescription", event.target.value)}
                      placeholder={formCopy.descriptionPlaceholder}
                      className={textareaClassName}
                    />
                  </div>
                </LocalePanel>

                <LocalePanel label={amLabel} optional={formCopy.optional} variant="secondary">
                  <div className="space-y-2">
                    <Label htmlFor="location-am-name">{formCopy.name}</Label>
                    <Input
                      id="location-am-name"
                      value={form.amName}
                      onChange={(event) => updateField("amName", event.target.value)}
                      placeholder={formCopy.namePlaceholderAm}
                      className={cn("w-full", fieldClassName)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location-am-description">{formCopy.description}</Label>
                    <textarea
                      id="location-am-description"
                      value={form.amDescription}
                      onChange={(event) => updateField("amDescription", event.target.value)}
                      placeholder={formCopy.descriptionPlaceholder}
                      className={textareaClassName}
                    />
                  </div>
                </LocalePanel>
              </div>
            </FormSection>

            <FormSection
              icon={MapPin}
              title={sectionCopy.placement}
              description={sectionCopy.placementDescription}
            >
              <div className="space-y-2">
                <Label
                  htmlFor="location-region"
                  className={fieldErrors.regionId ? "text-red-700" : undefined}
                >
                  {formCopy.region}
                </Label>
                <Select
                  value={form.regionId}
                  onValueChange={(value) => updateField("regionId", value ?? "")}
                >
                  <SelectTrigger
                    id="location-region"
                    className={cn(selectTriggerClassName, fieldErrors.regionId && fieldErrorClassName)}
                  >
                    <SelectValue placeholder={formCopy.regionPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldHint error={fieldErrors.regionId} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location-address">{formCopy.address}</Label>
                <Input
                  id="location-address"
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  placeholder={formCopy.addressPlaceholder}
                  className={cn("w-full", fieldClassName)}
                />
              </div>
            </FormSection>

            <FormSection
              icon={Navigation}
              title={sectionCopy.coordinates}
              description={sectionCopy.coordinatesDescription}
            >
              <LazyCoordinateMapPicker
                latitude={parsedLatitude}
                longitude={parsedLongitude}
                onCoordinatesChange={updateCoordinates}
                visible={open && !loading}
                title={sectionCopy.coordinates}
                hint={sectionCopy.mapPickerHint}
                loadingLabel={sectionCopy.mapLoading}
                emptyLabel={sectionCopy.mapEmpty}
                recenterLabel={sectionCopy.mapRecenter}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="location-latitude"
                    className={fieldErrors.latitude ? "text-red-700" : undefined}
                  >
                    {formCopy.latitude}
                  </Label>
                  <Input
                    id="location-latitude"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={form.latitude}
                    onChange={(event) => updateField("latitude", event.target.value)}
                    placeholder={formCopy.latitudePlaceholder}
                    className={cn(
                      "w-full",
                      fieldClassName,
                      fieldErrors.latitude && fieldErrorClassName,
                    )}
                    aria-invalid={Boolean(fieldErrors.latitude)}
                  />
                  <FieldHint error={fieldErrors.latitude} />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="location-longitude"
                    className={fieldErrors.longitude ? "text-red-700" : undefined}
                  >
                    {formCopy.longitude}
                  </Label>
                  <Input
                    id="location-longitude"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={form.longitude}
                    onChange={(event) => updateField("longitude", event.target.value)}
                    placeholder={formCopy.longitudePlaceholder}
                    className={cn(
                      "w-full",
                      fieldClassName,
                      fieldErrors.longitude && fieldErrorClassName,
                    )}
                    aria-invalid={Boolean(fieldErrors.longitude)}
                  />
                  <FieldHint error={fieldErrors.longitude} />
                </div>
              </div>

              <div
                className={cn(
                  "rounded-xl border px-4 py-3 transition-colors",
                  hasCoordinatePreview
                    ? "border-[#C9B87A]/35 bg-[#C9B87A]/8"
                    : "border-dashed border-slate-200 bg-slate-50/70",
                )}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8f7d45]">
                  {sectionCopy.coordinatesPreview}
                </p>
                <p
                  className={cn(
                    "mt-1 font-mono text-sm tabular-nums",
                    hasCoordinatePreview ? "text-[#1C3A34]" : "text-slate-400",
                  )}
                >
                  {hasCoordinatePreview
                    ? `${parsedLatitude!.toFixed(6)}, ${parsedLongitude!.toFixed(6)}`
                    : `${formCopy.latitudePlaceholder}, ${formCopy.longitudePlaceholder}`}
                </p>
              </div>
            </FormSection>

            <Card className={cn(adminCardClass, "gap-0 overflow-hidden py-0 shadow-none ring-0")}>
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className={cn("text-sm font-semibold", adminHeadingClass)}>
                    {sectionCopy.isActiveTitle}
                  </p>
                  <p className="text-xs leading-relaxed text-slate-500">
                    {form.isActive ? sectionCopy.isActiveOn : sectionCopy.isActiveOff}
                  </p>
                </div>
                <Switch
                  id="location-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) => updateField("isActive", checked)}
                  disabled={submitting || loading}
                  aria-label={formCopy.active}
                />
              </div>
              <div className="border-t border-slate-100 px-5 py-3">
                <p className="text-xs leading-relaxed text-slate-500">
                  {sectionCopy.isActiveDescription}
                </p>
              </div>
            </Card>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </form>
        )}

        <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting || loading}
            className="border-slate-200"
          >
            {formCopy.cancel}
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={submitting || loading}
            className={adminPrimaryButtonClass}
          >
            {submitting
              ? isEdit
                ? formCopy.saving
                : formCopy.creating
              : isEdit
                ? formCopy.save
                : formCopy.create}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
