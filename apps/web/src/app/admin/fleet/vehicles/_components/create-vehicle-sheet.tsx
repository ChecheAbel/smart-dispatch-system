"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Car, ClipboardList, CreditCard, UserRound } from "lucide-react";
import type { Vehicle, VehicleStatus } from "@smart-dispatch/types";
import { createVehicle, fetchVehicleById, fetchVehicleDriverOptions, updateVehicle } from "@/lib/vehicle-api";
import { fetchActiveVehicleTypes } from "@/lib/vehicle-type-api";
import { fetchActiveVehicleClasses } from "@/lib/vehicle-class-api";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { useLocale } from "@/components/shared/providers";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ETHIOPIAN_PLATE_CATEGORY_CODES,
  ETHIOPIAN_PLATE_REGION_CODES,
  formatEthiopianPlate,
  isValidEthiopianPlateParts,
  parseEthiopianPlate,
} from "@/lib/ethiopian-plate";

const VEHICLE_STATUSES: VehicleStatus[] = ["active", "maintenance", "retired"];

type VehicleFormSheetMode = "create" | "edit";

type CreateVehicleSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: VehicleFormSheetMode;
  vehicleId?: string | null;
  onSuccess?: () => void;
};

type VehicleFormState = {
  plateRegion: string;
  plateCode: string;
  plateLicense: string;
  vehicleTypeId: string;
  vehicleClassId: string;
  assignedDriverUserId: string;
  chassisNumber: string;
  make: string;
  model: string;
  year: string;
  status: VehicleStatus;
  notes: string;
};

type FieldErrors = Partial<Record<keyof VehicleFormState, string>>;

const emptyForm: VehicleFormState = {
  plateRegion: "",
  plateCode: "",
  plateLicense: "",
  vehicleTypeId: "",
  vehicleClassId: "",
  assignedDriverUserId: "",
  chassisNumber: "",
  make: "",
  model: "",
  year: "",
  status: "active",
  notes: "",
};

function mapVehicleToForm(vehicle: Vehicle): VehicleFormState {
  const plate = parseEthiopianPlate(vehicle.plate_number);

  return {
    plateRegion: plate.region,
    plateCode: plate.code,
    plateLicense: plate.license,
    vehicleTypeId: vehicle.vehicle_type_id,
    vehicleClassId: vehicle.vehicle_class_id,
    assignedDriverUserId: vehicle.assigned_driver_user_id ?? "",
    chassisNumber: vehicle.chassis_number ?? "",
    make: vehicle.make ?? "",
    model: vehicle.model ?? "",
    year: vehicle.year != null ? String(vehicle.year) : "",
    status: vehicle.status,
    notes: vehicle.notes ?? "",
  };
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
  icon: typeof Car;
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

function FieldHint({ children, error }: { children?: ReactNode; error?: string }) {
  if (error) {
    return <p className="text-xs text-red-600">{error}</p>;
  }

  if (!children) {
    return null;
  }

  return <p className="text-xs text-slate-500">{children}</p>;
}

const PLATE_FIELD_KEYS = ["plateRegion", "plateCode", "plateLicense"] as const;

export function CreateVehicleSheet({
  open,
  onOpenChange,
  mode = "create",
  vehicleId = null,
  onSuccess,
}: CreateVehicleSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminVehiclesMessages(locale);
  const formCopy = copy.form;
  const sectionCopy = formCopy.sections;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<VehicleFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [vehicleClassOptions, setVehicleClassOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [driverOptions, setDriverOptions] = useState<Array<{ label: string; value: string }>>([]);

  const vehicleTypeItems = useMemo(
    () => [{ label: formCopy.vehicleTypePlaceholder, value: "" }, ...vehicleTypeOptions],
    [formCopy.vehicleTypePlaceholder, vehicleTypeOptions],
  );

  const vehicleClassItems = useMemo(
    () => [{ label: formCopy.vehicleClassPlaceholder, value: "" }, ...vehicleClassOptions],
    [formCopy.vehicleClassPlaceholder, vehicleClassOptions],
  );

  const driverItems = useMemo(
    () => [{ label: formCopy.noDriver, value: "" }, ...driverOptions],
    [formCopy.noDriver, driverOptions],
  );

  const statusItems = useMemo(
    () =>
      VEHICLE_STATUSES.map((status) => ({
        label: copy.status[status],
        value: status,
      })),
    [copy.status],
  );

  const plateRegionOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = ETHIOPIAN_PLATE_REGION_CODES.map(
      (code) => ({
        value: code,
        label: `${code} — ${formCopy.plateRegions[code] ?? code}`,
      }),
    );

    if (
      form.plateRegion &&
      !ETHIOPIAN_PLATE_REGION_CODES.includes(
        form.plateRegion as (typeof ETHIOPIAN_PLATE_REGION_CODES)[number],
      )
    ) {
      options.unshift({ value: form.plateRegion, label: form.plateRegion });
    }

    return options;
  }, [form.plateRegion, formCopy.plateRegions]);

  const plateCodeOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = ETHIOPIAN_PLATE_CATEGORY_CODES.map(
      (code) => ({
        value: code,
        label: `${code} — ${formCopy.plateCodes[code] ?? code}`,
      }),
    );

    if (
      form.plateCode &&
      !ETHIOPIAN_PLATE_CATEGORY_CODES.includes(
        form.plateCode as (typeof ETHIOPIAN_PLATE_CATEGORY_CODES)[number],
      )
    ) {
      options.unshift({ value: form.plateCode, label: form.plateCode });
    }

    return options;
  }, [form.plateCode, formCopy.plateCodes]);

  const plateRegionItems = useMemo(
    () => [{ label: formCopy.plateRegionPlaceholder, value: "" }, ...plateRegionOptions],
    [formCopy.plateRegionPlaceholder, plateRegionOptions],
  );

  const plateCodeItems = useMemo(
    () => [{ label: formCopy.plateCodePlaceholder, value: "" }, ...plateCodeOptions],
    [formCopy.plateCodePlaceholder, plateCodeOptions],
  );

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      setSubmitting(false);
      setLoading(false);
      setOptionsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      setOptionsLoading(true);

      try {
        const [vehicleTypes, vehicleClasses, drivers] = await Promise.all([
          fetchActiveVehicleTypes(locale),
          fetchActiveVehicleClasses(locale),
          fetchVehicleDriverOptions(),
        ]);
        if (!cancelled) {
          setVehicleTypeOptions(
            vehicleTypes.map((vehicleType) => ({
              label: vehicleType.name,
              value: vehicleType.id,
            })),
          );
          setVehicleClassOptions(
            vehicleClasses.map((vehicleClass) => ({
              label: vehicleClass.name,
              value: vehicleClass.id,
            })),
          );
          setDriverOptions(
            drivers.map((driver) => ({
              label: `${driver.name} (${driver.email})`,
              value: driver.id,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setVehicleTypeOptions([]);
          setVehicleClassOptions([]);
          setDriverOptions([]);
        }
      } finally {
        if (!cancelled) {
          setOptionsLoading(false);
        }
      }
    }

    void loadOptions();

    if (!isEdit) {
      setForm(emptyForm);
      return () => {
        cancelled = true;
      };
    }

    if (!vehicleId) {
      return () => {
        cancelled = true;
      };
    }

    const editingId = vehicleId;

    async function loadVehicle() {
      setLoading(true);
      setError(null);

      try {
        const vehicle = await fetchVehicleById(editingId, locale);
        if (!cancelled) {
          setForm(mapVehicleToForm(vehicle));
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

    void loadVehicle();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, vehicleId, locale, formCopy.errors.loadFailed, toastCopy.loadFailed.title]);

  function updateField<K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      if (current[key]) {
        delete next[key];
      }

      if (PLATE_FIELD_KEYS.includes(key as (typeof PLATE_FIELD_KEYS)[number])) {
        for (const plateKey of PLATE_FIELD_KEYS) {
          delete next[plateKey];
        }
      }

      return next;
    });
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const plateParts = {
      region: form.plateRegion.trim().toUpperCase(),
      code: form.plateCode.trim(),
      license: form.plateLicense.trim(),
    };

    const nextErrors: FieldErrors = {};

    if (!plateParts.region) {
      nextErrors.plateRegion = formCopy.errors.plateRegionRequired;
    }

    if (!plateParts.code) {
      nextErrors.plateCode = formCopy.errors.plateCodeRequired;
    }

    if (!plateParts.license) {
      nextErrors.plateLicense = formCopy.errors.plateLicenseRequired;
    }

    if (
      plateParts.region &&
      plateParts.code &&
      plateParts.license &&
      !isValidEthiopianPlateParts(plateParts)
    ) {
      nextErrors.plateLicense = formCopy.errors.plateInvalid;
    }

    const plateNumber = formatEthiopianPlate(plateParts);

    if (!plateNumber) {
      nextErrors.plateRegion = nextErrors.plateRegion ?? formCopy.errors.plateRequired;
    }

    const vehicleTypeId = form.vehicleTypeId;

    if (!vehicleTypeId) {
      nextErrors.vehicleTypeId = formCopy.errors.typeRequired;
    }

    const vehicleClassId = form.vehicleClassId;

    if (!vehicleClassId) {
      nextErrors.vehicleClassId = formCopy.errors.classRequired;
    }

    const chassisNumber = form.chassisNumber.trim().toUpperCase();
    if (!chassisNumber) {
      nextErrors.chassisNumber = formCopy.errors.chassisNumberRequired;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const yearValue = form.year.trim();
    const year = yearValue ? Number(yearValue) : null;

    const payload = {
      plate_number: plateNumber,
      vehicle_type_id: vehicleTypeId,
      vehicle_class_id: vehicleClassId,
      assigned_driver_user_id: form.assignedDriverUserId || null,
      chassis_number: chassisNumber,
      make: form.make.trim() || null,
      model: form.model.trim() || null,
      year,
      status: form.status,
      notes: form.notes.trim() || null,
    };

    setSubmitting(true);

    try {
      if (isEdit && vehicleId) {
        const vehicle = await updateVehicle(vehicleId, payload);
        showSuccessToast({
          title: toastCopy.updateSuccess.title,
          description: formatMessage(toastCopy.updateSuccess.description, {
            name: vehicle.plate_number,
          }),
        });
      } else {
        const vehicle = await createVehicle(payload);
        showSuccessToast({
          title: toastCopy.createSuccess.title,
          description: formatMessage(toastCopy.createSuccess.description, {
            name: vehicle.plate_number,
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

  const formId = "vehicle-form-sheet";
  const platePreview = formatEthiopianPlate({
    region: form.plateRegion,
    code: form.plateCode,
    license: form.plateLicense,
  });
  const hasPlateError = Boolean(
    fieldErrors.plateRegion || fieldErrors.plateCode || fieldErrors.plateLicense,
  );
  const plateErrorMessage =
    fieldErrors.plateRegion ?? fieldErrors.plateCode ?? fieldErrors.plateLicense;

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
              icon={CreditCard}
              title={sectionCopy.plate}
              description={sectionCopy.plateDescription}
            >
              <div
                className={cn(
                  "overflow-hidden rounded-xl border transition-colors",
                  platePreview
                    ? "border-[#1C3A34]/20 shadow-sm"
                    : "border-dashed border-slate-200 bg-slate-50/60",
                )}
              >
                <div className="bg-[#1C3A34] px-4 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C9B87A]">
                    {formCopy.plateNumber}
                  </p>
                </div>
                <div className="bg-white px-4 py-5 text-center">
                  <p
                    className={cn(
                      "font-mono text-2xl font-bold tracking-[0.2em] tabular-nums sm:text-3xl",
                      platePreview ? "text-[#1C3A34]" : "text-slate-300",
                    )}
                  >
                    {platePreview || sectionCopy.platePreviewEmpty}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="vehicle-plate-region"
                    className={fieldErrors.plateRegion ? "text-red-700" : undefined}
                  >
                    {formCopy.plateRegion}
                  </Label>
                  <Select
                    items={plateRegionItems}
                    value={form.plateRegion || null}
                    onValueChange={(value) => updateField("plateRegion", value ?? "")}
                  >
                    <SelectTrigger
                      id="vehicle-plate-region"
                      className={cn(
                        selectTriggerClassName,
                        fieldErrors.plateRegion && fieldErrorClassName,
                      )}
                      aria-invalid={Boolean(fieldErrors.plateRegion)}
                    >
                      <SelectValue placeholder={formCopy.plateRegionPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {plateRegionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="vehicle-plate-code"
                    className={fieldErrors.plateCode ? "text-red-700" : undefined}
                  >
                    {formCopy.plateCode}
                  </Label>
                  <Select
                    items={plateCodeItems}
                    value={form.plateCode || null}
                    onValueChange={(value) => updateField("plateCode", value ?? "")}
                  >
                    <SelectTrigger
                      id="vehicle-plate-code"
                      className={cn(
                        selectTriggerClassName,
                        fieldErrors.plateCode && fieldErrorClassName,
                      )}
                      aria-invalid={Boolean(fieldErrors.plateCode)}
                    >
                      <SelectValue placeholder={formCopy.plateCodePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {plateCodeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="vehicle-plate-license"
                  className={fieldErrors.plateLicense ? "text-red-700" : undefined}
                >
                  {formCopy.plateLicense}
                </Label>
                <Input
                  id="vehicle-plate-license"
                  value={form.plateLicense}
                  onChange={(event) =>
                    updateField("plateLicense", event.target.value.replace(/\D/g, ""))
                  }
                  placeholder={formCopy.plateLicensePlaceholder}
                  maxLength={6}
                  inputMode="numeric"
                  className={cn(
                    "w-full font-mono tracking-wider",
                    fieldClassName,
                    fieldErrors.plateLicense && fieldErrorClassName,
                  )}
                  aria-invalid={Boolean(fieldErrors.plateLicense)}
                  autoComplete="off"
                />
                <FieldHint error={hasPlateError ? plateErrorMessage : undefined} />
              </div>
            </FormSection>

            <FormSection
              icon={Car}
              title={sectionCopy.classification}
              description={sectionCopy.classificationDescription}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="vehicle-type-id"
                    className={fieldErrors.vehicleTypeId ? "text-red-700" : undefined}
                  >
                    {formCopy.vehicleType}
                  </Label>
                  <Select
                    items={vehicleTypeItems}
                    value={form.vehicleTypeId || null}
                    onValueChange={(value) => updateField("vehicleTypeId", value ?? "")}
                    disabled={optionsLoading}
                  >
                    <SelectTrigger
                      id="vehicle-type-id"
                      className={cn(
                        selectTriggerClassName,
                        fieldErrors.vehicleTypeId && fieldErrorClassName,
                      )}
                      aria-invalid={Boolean(fieldErrors.vehicleTypeId)}
                    >
                      <SelectValue placeholder={formCopy.vehicleTypePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {vehicleTypeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldHint error={fieldErrors.vehicleTypeId} />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="vehicle-class-id"
                    className={fieldErrors.vehicleClassId ? "text-red-700" : undefined}
                  >
                    {formCopy.vehicleClass}
                  </Label>
                  <Select
                    items={vehicleClassItems}
                    value={form.vehicleClassId || null}
                    onValueChange={(value) => updateField("vehicleClassId", value ?? "")}
                    disabled={optionsLoading}
                  >
                    <SelectTrigger
                      id="vehicle-class-id"
                      className={cn(
                        selectTriggerClassName,
                        fieldErrors.vehicleClassId && fieldErrorClassName,
                      )}
                      aria-invalid={Boolean(fieldErrors.vehicleClassId)}
                    >
                      <SelectValue placeholder={formCopy.vehicleClassPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {vehicleClassOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldHint error={fieldErrors.vehicleClassId} />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="vehicle-status">{formCopy.status}</Label>
                  <Select
                    items={statusItems}
                    value={form.status}
                    onValueChange={(value) =>
                      updateField("status", (value ?? "active") as VehicleStatus)
                    }
                  >
                    <SelectTrigger id="vehicle-status" className={selectTriggerClassName}>
                      <SelectValue placeholder={formCopy.status} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {VEHICLE_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {copy.status[status]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={UserRound}
              title={sectionCopy.assignment}
              description={sectionCopy.assignmentDescription}
            >
              <div className="space-y-2">
                <Label htmlFor="vehicle-driver-id">{formCopy.assignedDriver}</Label>
                <Select
                  items={driverItems}
                  value={form.assignedDriverUserId || null}
                  onValueChange={(value) => updateField("assignedDriverUserId", value ?? "")}
                  disabled={optionsLoading}
                >
                  <SelectTrigger id="vehicle-driver-id" className={selectTriggerClassName}>
                    <SelectValue placeholder={formCopy.assignedDriverPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="">{formCopy.noDriver}</SelectItem>
                      {driverOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </FormSection>

            <FormSection
              icon={ClipboardList}
              title={sectionCopy.details}
              description={sectionCopy.detailsDescription}
            >
              <div className="space-y-2">
                <Label
                  htmlFor="vehicle-chassis-number"
                  className={fieldErrors.chassisNumber ? "text-red-700" : undefined}
                >
                  {formCopy.chassisNumber}
                </Label>
                <Input
                  id="vehicle-chassis-number"
                  value={form.chassisNumber}
                  onChange={(event) =>
                    updateField("chassisNumber", event.target.value.toUpperCase().replace(/\s+/g, ""))
                  }
                  placeholder={formCopy.chassisNumberPlaceholder}
                  className={cn(
                    "w-full font-mono tracking-wide",
                    fieldClassName,
                    fieldErrors.chassisNumber && fieldErrorClassName,
                  )}
                  aria-invalid={Boolean(fieldErrors.chassisNumber)}
                  autoComplete="off"
                />
                <FieldHint error={fieldErrors.chassisNumber}>{formCopy.chassisNumberHint}</FieldHint>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-make">{formCopy.make}</Label>
                  <Input
                    id="vehicle-make"
                    value={form.make}
                    onChange={(event) => updateField("make", event.target.value)}
                    placeholder={formCopy.makePlaceholder}
                    className={cn("w-full", fieldClassName)}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle-model">{formCopy.model}</Label>
                  <Input
                    id="vehicle-model"
                    value={form.model}
                    onChange={(event) => updateField("model", event.target.value)}
                    placeholder={formCopy.modelPlaceholder}
                    className={cn("w-full", fieldClassName)}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-year">
                  {formCopy.year}
                  <span className="ml-2 text-xs font-normal text-slate-500">{formCopy.optional}</span>
                </Label>
                <Input
                  id="vehicle-year"
                  type="number"
                  min={1900}
                  max={2100}
                  value={form.year}
                  onChange={(event) => updateField("year", event.target.value)}
                  placeholder={formCopy.yearPlaceholder}
                  className={cn("w-full", fieldClassName)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle-notes">
                  {formCopy.notes}
                  <span className="ml-2 text-xs font-normal text-slate-500">{formCopy.optional}</span>
                </Label>
                <textarea
                  id="vehicle-notes"
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder={formCopy.notesPlaceholder}
                  className={textareaClassName}
                />
              </div>
            </FormSection>

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
            disabled={submitting || loading || optionsLoading}
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
