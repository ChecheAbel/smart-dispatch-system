"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Coins, Languages, MapPin, Receipt, Settings2 } from "lucide-react";
import type { FarePlan, PricingModel, Region, VehicleType, VehicleClass } from "@smart-dispatch/types";
import {
  createFarePlan,
  fetchFarePlanById,
  updateFarePlan,
} from "@/lib/fare-plan-api";
import { fetchActiveRegions } from "@/lib/region-api";
import { fetchActiveVehicleTypes } from "@/lib/vehicle-type-api";
import { fetchActiveVehicleClasses } from "@/lib/vehicle-class-api";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { LOCALE_OPTIONS } from "@/lib/locale";
import { useLocale } from "@/components/shared/providers";
import { formatMessage, getAdminFarePlansMessages } from "@/translations";
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

const PRICING_MODELS: PricingModel[] = [
  "flat",
  "distance",
  "time",
  "distance_time",
  "hourly",
];

const CURRENCY_CODES = ["ETB", "USD", "EUR", "GBP"] as const;

type FarePlanFormSheetMode = "create" | "edit";

type CreateFarePlanSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: FarePlanFormSheetMode;
  farePlanId?: string | null;
  onSuccess?: () => void;
};

type FarePlanFormState = {
  enName: string;
  enDescription: string;
  amName: string;
  amDescription: string;
  vehicleTypeId: string;
  vehicleClassId: string;
  regionId: string;
  pricingModel: PricingModel | "";
  currency: string;
  baseFare: string;
  perKmRate: string;
  perMinuteRate: string;
  minimumFare: string;
  minimumHours: string;
  bookingFee: string;
  freeWaitingMinutes: string;
  waitingFeePerMinute: string;
  priority: string;
  isActive: boolean;
};

type FieldErrors = Partial<Record<keyof FarePlanFormState, string>>;

const emptyForm: FarePlanFormState = {
  enName: "",
  enDescription: "",
  amName: "",
  amDescription: "",
  vehicleTypeId: "",
  vehicleClassId: "",
  regionId: "",
  pricingModel: "distance_time",
  currency: "ETB",
  baseFare: "",
  perKmRate: "",
  perMinuteRate: "",
  minimumFare: "",
  minimumHours: "",
  bookingFee: "",
  freeWaitingMinutes: "5",
  waitingFeePerMinute: "",
  priority: "0",
  isActive: true,
};

function parseOptionalHours(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100) / 100;
}

function deriveMinimumHours(baseFare: number, minimumFare: number | null) {
  if (minimumFare == null || baseFare <= 0) return "";
  return String(Math.round((minimumFare / baseFare) * 100) / 100);
}

function mapFarePlanToForm(farePlan: FarePlan): FarePlanFormState {
  const en = farePlan.translations?.find((translation) => translation.locale === "en");
  const am = farePlan.translations?.find((translation) => translation.locale === "am");

  return {
    enName: en?.name ?? farePlan.name,
    enDescription: en?.description ?? farePlan.description ?? "",
    amName: am?.name ?? "",
    amDescription: am?.description ?? "",
    vehicleTypeId: farePlan.vehicle_type_id ?? "",
    vehicleClassId: farePlan.vehicle_class_id ?? "",
    regionId: farePlan.region_id ?? "",
    pricingModel: farePlan.pricing_model,
    currency: farePlan.currency,
    baseFare: String(farePlan.base_fare),
    perKmRate: farePlan.per_km_rate != null ? String(farePlan.per_km_rate) : "",
    perMinuteRate: farePlan.per_minute_rate != null ? String(farePlan.per_minute_rate) : "",
    minimumFare: farePlan.minimum_fare != null ? String(farePlan.minimum_fare) : "",
    minimumHours:
      farePlan.pricing_model === "hourly"
        ? deriveMinimumHours(farePlan.base_fare, farePlan.minimum_fare)
        : "",
    bookingFee: farePlan.booking_fee != null ? String(farePlan.booking_fee) : "",
    freeWaitingMinutes:
      farePlan.free_waiting_minutes != null ? String(farePlan.free_waiting_minutes) : "",
    waitingFeePerMinute:
      farePlan.waiting_fee_per_minute != null ? String(farePlan.waiting_fee_per_minute) : "",
    priority: String(farePlan.priority),
    isActive: farePlan.is_active,
  };
}

function parseOptionalMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100) / 100;
}

function parseRequiredMoney(value: string) {
  const parsed = parseOptionalMoney(value);
  return parsed === undefined ? undefined : parsed;
}

function parseOptionalInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.trunc(parsed);
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
  icon: typeof Receipt;
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

function CurrencyInput({
  id,
  currency,
  value,
  onChange,
  error,
  min = "0",
  step = "0.01",
}: {
  id: string;
  currency: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  min?: string;
  step?: string;
}) {
  const currencyCode = currency.trim().toUpperCase() || "ETB";

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        error &&
          "border-red-300 bg-red-50/60 focus-within:border-red-400 focus-within:ring-red-200/60",
      )}
    >
      <span
        aria-hidden
        className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-600 tabular-nums"
      >
        {currencyCode}
      </span>
      <Input
        id={id}
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "h-10 rounded-none border-0 bg-transparent px-3.5 shadow-none focus-visible:ring-0",
          error && "text-red-900 placeholder:text-red-400",
        )}
      />
    </div>
  );
}

export function CreateFarePlanSheet({
  open,
  onOpenChange,
  mode = "create",
  farePlanId = null,
  onSuccess,
}: CreateFarePlanSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminFarePlansMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const isEdit = mode === "edit";

  const [form, setForm] = useState<FarePlanFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  const isHourly = form.pricingModel === "hourly";
  const isFlat = form.pricingModel === "flat";

  const showPerKmRate = useMemo(
    () => ["distance", "distance_time"].includes(form.pricingModel),
    [form.pricingModel],
  );
  const showPerMinuteRate = useMemo(
    () => ["time", "distance_time"].includes(form.pricingModel),
    [form.pricingModel],
  );

  const baseFareLabel = useMemo(() => {
    if (isFlat) return formCopy.flatFare;
    if (isHourly) return formCopy.perHourRate;
    return formCopy.baseFare;
  }, [formCopy.baseFare, formCopy.flatFare, formCopy.perHourRate, isFlat, isHourly]);

  const pricingModelHelp = form.pricingModel
    ? copy.pricingModelHelp[form.pricingModel as PricingModel]
    : null;

  const pricingModelItems = useMemo(
    () =>
      PRICING_MODELS.map((model) => ({
        label: copy.pricingModels[model],
        value: model,
      })),
    [copy.pricingModels],
  );

  const vehicleTypeItems = useMemo(
    () => [
      { label: copy.allVehicleTypes, value: "all" },
      ...vehicleTypes.map((vehicleType) => ({
        label: vehicleType.name,
        value: vehicleType.id,
      })),
    ],
    [copy.allVehicleTypes, vehicleTypes],
  );

  const vehicleClassItems = useMemo(
    () => [
      { label: copy.allVehicleClasses, value: "all" },
      ...vehicleClasses.map((vehicleClass) => ({
        label: vehicleClass.name,
        value: vehicleClass.id,
      })),
    ],
    [copy.allVehicleClasses, vehicleClasses],
  );

  const regionItems = useMemo(
    () => [
      { label: copy.allRegions, value: "all" },
      ...regions.map((region) => ({
        label: region.name,
        value: region.id,
      })),
    ],
    [copy.allRegions, regions],
  );

  const currencyItems = useMemo(() => {
    const items: Array<{ value: string; label: string }> = CURRENCY_CODES.map((code) => ({
      value: code,
      label: formCopy.currencies[code],
    }));

    if (form.currency && !CURRENCY_CODES.includes(form.currency as (typeof CURRENCY_CODES)[number])) {
      items.push({ value: form.currency, label: form.currency });
    }

    return items;
  }, [formCopy.currencies, form.currency]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setFieldErrors({});
      setError(null);
      setSubmitting(false);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      try {
        const [nextVehicleTypes, nextVehicleClasses, nextRegions] = await Promise.all([
          fetchActiveVehicleTypes(locale),
          fetchActiveVehicleClasses(locale),
          fetchActiveRegions(locale),
        ]);

        if (!cancelled) {
          setVehicleTypes(nextVehicleTypes);
          setVehicleClasses(nextVehicleClasses);
          setRegions(nextRegions);
        }
      } catch {
        if (!cancelled) {
          setVehicleTypes([]);
          setRegions([]);
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

    if (!farePlanId) {
      return () => {
        cancelled = true;
      };
    }

    const editingId = farePlanId;

    async function loadFarePlan() {
      setLoading(true);
      setError(null);

      try {
        const farePlan = await fetchFarePlanById(editingId);
        if (!cancelled) {
          setForm(mapFarePlanToForm(farePlan));
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

    void loadFarePlan();

    return () => {
      cancelled = true;
    };
  }, [open, isEdit, farePlanId, locale, formCopy.errors.loadFailed, toastCopy.loadFailed.title]);

  function updateField<K extends keyof FarePlanFormState>(
    key: K,
    value: FarePlanFormState[K],
  ) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const enName = form.enName.trim();
    const amName = form.amName.trim();
    const nextErrors: FieldErrors = {};

    if (!enName) {
      nextErrors.enName = formCopy.errors.enNameRequired;
    }

    if (!form.pricingModel) {
      nextErrors.pricingModel = formCopy.errors.pricingModelRequired;
    }

    const baseFare = parseRequiredMoney(form.baseFare);
    if (baseFare === undefined) {
      nextErrors.baseFare = form.baseFare.trim()
        ? formCopy.errors.baseFareInvalid
        : formCopy.errors.baseFareRequired;
    }

    const perKmRate = showPerKmRate ? parseOptionalMoney(form.perKmRate) : null;
    if (showPerKmRate && form.perKmRate.trim() && perKmRate === undefined) {
      nextErrors.perKmRate = formCopy.errors.rateInvalid;
    }

    const perMinuteRate = showPerMinuteRate ? parseOptionalMoney(form.perMinuteRate) : null;
    if (showPerMinuteRate && form.perMinuteRate.trim() && perMinuteRate === undefined) {
      nextErrors.perMinuteRate = formCopy.errors.rateInvalid;
    }

    const minimumHours = isHourly ? parseOptionalHours(form.minimumHours) : null;
    if (isHourly && form.minimumHours.trim() && minimumHours === undefined) {
      nextErrors.minimumHours = formCopy.errors.hoursInvalid;
    }

    let minimumFare: number | null | undefined = null;
    if (!isHourly) {
      minimumFare = parseOptionalMoney(form.minimumFare);
      if (form.minimumFare.trim() && minimumFare === undefined) {
        nextErrors.minimumFare = formCopy.errors.rateInvalid;
      }
    }

    const bookingFee = parseOptionalMoney(form.bookingFee);
    if (form.bookingFee.trim() && bookingFee === undefined) {
      nextErrors.bookingFee = formCopy.errors.rateInvalid;
    }

    const freeWaitingMinutes = parseOptionalInt(form.freeWaitingMinutes);
    if (form.freeWaitingMinutes.trim() && freeWaitingMinutes === undefined) {
      nextErrors.freeWaitingMinutes = formCopy.errors.waitingInvalid;
    }

    const waitingFeePerMinute = parseOptionalMoney(form.waitingFeePerMinute);
    if (form.waitingFeePerMinute.trim() && waitingFeePerMinute === undefined) {
      nextErrors.waitingFeePerMinute = formCopy.errors.rateInvalid;
    }

    const priority = parseOptionalInt(form.priority);
    if (priority === undefined) {
      nextErrors.priority = formCopy.errors.priorityInvalid;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const resolvedBaseFare = baseFare as number;

    const resolvedMinimumFare = isHourly
      ? minimumHours != null
        ? Math.round(minimumHours * resolvedBaseFare * 100) / 100
        : null
      : (minimumFare ?? null);

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

    const resolvedPerMinuteRate = isHourly
      ? Math.round((resolvedBaseFare / 60) * 100) / 100
      : perMinuteRate;

    const payload = {
      translations,
      vehicle_type_id: form.vehicleTypeId || null,
      vehicle_class_id: form.vehicleClassId || null,
      region_id: form.regionId || null,
      pricing_model: form.pricingModel as PricingModel,
      currency: form.currency.trim().toUpperCase() || "ETB",
      base_fare: resolvedBaseFare,
      per_km_rate: isHourly ? null : perKmRate,
      per_minute_rate: isHourly || showPerMinuteRate ? resolvedPerMinuteRate : null,
      minimum_fare: resolvedMinimumFare,
      booking_fee: bookingFee,
      free_waiting_minutes: freeWaitingMinutes,
      waiting_fee_per_minute: waitingFeePerMinute,
      priority: priority ?? 0,
      is_active: form.isActive,
    };

    setSubmitting(true);

    try {
      const farePlan = isEdit && farePlanId
        ? await updateFarePlan(farePlanId, payload)
        : await createFarePlan(payload);

      showSuccessToast({
        title: isEdit ? toastCopy.updateSuccess.title : toastCopy.createSuccess.title,
        description: formatMessage(
          isEdit ? toastCopy.updateSuccess.description : toastCopy.createSuccess.description,
          { name: farePlan.name },
        ),
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : isEdit
            ? formCopy.errors.updateFailed
            : formCopy.errors.createFailed;
      setError(message);
      showErrorToast({
        title: isEdit ? toastCopy.loadFailed.title : toastCopy.loadFailed.title,
        description: message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto border-l border-slate-200 p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl"
      >
        <SheetHeader className="border-b border-slate-200 px-6 py-5">
          <SheetTitle className={adminHeadingClass}>
            {isEdit ? formCopy.editTitle : formCopy.createTitle}
          </SheetTitle>
          <SheetDescription>
            {isEdit ? formCopy.editDescription : formCopy.createDescription}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 px-6 py-5">
            {loading ? (
              <p className="text-sm text-slate-500">{formCopy.loading}</p>
            ) : null}

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <FormSection
              icon={Languages}
              title={formCopy.sections.identity}
              description={formCopy.sections.identityDescription}
            >
              {LOCALE_OPTIONS.map((option) => {
                const isEnglish = option.value === "en";
                const nameKey = isEnglish ? "enName" : "amName";
                const descriptionKey = isEnglish ? "enDescription" : "amDescription";

                return (
                  <div key={option.value} className="space-y-4 rounded-lg border border-slate-100 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {option.label}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor={`fare-plan-${nameKey}`}>
                        {formCopy.name}
                        {!isEnglish ? ` ${formCopy.optional}` : null}
                      </Label>
                      <Input
                        id={`fare-plan-${nameKey}`}
                        value={form[nameKey]}
                        onChange={(event) => updateField(nameKey, event.target.value)}
                        placeholder={
                          isEnglish ? formCopy.namePlaceholderEn : formCopy.namePlaceholderAm
                        }
                        className={cn(fieldClassName, fieldErrors[nameKey] && fieldErrorClassName)}
                      />
                      {fieldErrors[nameKey] ? (
                        <p className="text-xs text-red-600">{fieldErrors[nameKey]}</p>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`fare-plan-${descriptionKey}`}>
                        {formCopy.description} {formCopy.optional}
                      </Label>
                      <textarea
                        id={`fare-plan-${descriptionKey}`}
                        value={form[descriptionKey]}
                        onChange={(event) => updateField(descriptionKey, event.target.value)}
                        placeholder={formCopy.descriptionPlaceholder}
                        className={textareaClassName}
                      />
                    </div>
                  </div>
                );
              })}
            </FormSection>

            <FormSection
              icon={MapPin}
              title={formCopy.sections.scope}
              description={formCopy.sections.scopeDescription}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>{formCopy.vehicleType}</Label>
                  <Select
                    items={vehicleTypeItems}
                    value={form.vehicleTypeId || "all"}
                    onValueChange={(value) =>
                      updateField("vehicleTypeId", !value || value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className={selectTriggerClassName}>
                      <SelectValue placeholder={formCopy.vehicleTypePlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">{copy.allVehicleTypes}</SelectItem>
                        {vehicleTypes.map((vehicleType) => (
                          <SelectItem key={vehicleType.id} value={vehicleType.id}>
                            {vehicleType.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{formCopy.vehicleClass}</Label>
                  <Select
                    items={vehicleClassItems}
                    value={form.vehicleClassId || "all"}
                    onValueChange={(value) =>
                      updateField("vehicleClassId", !value || value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className={selectTriggerClassName}>
                      <SelectValue placeholder={formCopy.vehicleClassPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">{copy.allVehicleClasses}</SelectItem>
                        {vehicleClasses.map((vehicleClass) => (
                          <SelectItem key={vehicleClass.id} value={vehicleClass.id}>
                            {vehicleClass.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                  <Label>{formCopy.region}</Label>
                  <Select
                    items={regionItems}
                    value={form.regionId || "all"}
                    onValueChange={(value) =>
                      updateField("regionId", !value || value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className={selectTriggerClassName}>
                      <SelectValue placeholder={formCopy.regionPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">{copy.allRegions}</SelectItem>
                        {regions.map((region) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={Coins}
              title={formCopy.sections.pricing}
              description={formCopy.sections.pricingDescription}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>{formCopy.pricingModel}</Label>
                  <Select
                    items={pricingModelItems}
                    value={form.pricingModel}
                    onValueChange={(value) => {
                      const model = (value ?? "") as PricingModel | "";
                      setForm((current) => {
                        const next: FarePlanFormState = {
                          ...current,
                          pricingModel: model,
                          minimumHours: model === "hourly" ? current.minimumHours : "",
                        };

                        if (
                          model === "hourly" &&
                          current.baseFare &&
                          current.minimumFare &&
                          !current.minimumHours
                        ) {
                          const base = Number(current.baseFare);
                          const minimum = Number(current.minimumFare);
                          if (Number.isFinite(base) && base > 0 && Number.isFinite(minimum)) {
                            next.minimumHours = deriveMinimumHours(base, minimum);
                          }
                        }

                        return next;
                      });
                      setFieldErrors((current) => {
                        const next = { ...current };
                        delete next.pricingModel;
                        delete next.minimumFare;
                        delete next.minimumHours;
                        delete next.perMinuteRate;
                        return next;
                      });
                      setError(null);
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        selectTriggerClassName,
                        fieldErrors.pricingModel && fieldErrorClassName,
                      )}
                    >
                      <SelectValue placeholder={formCopy.pricingModelPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {PRICING_MODELS.map((model) => (
                          <SelectItem key={model} value={model}>
                            {copy.pricingModels[model]}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {fieldErrors.pricingModel ? (
                    <p className="text-xs text-red-600">{fieldErrors.pricingModel}</p>
                  ) : null}
                  {pricingModelHelp ? (
                    <p className="text-xs leading-relaxed text-slate-500">{pricingModelHelp}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fare-plan-currency">{formCopy.currency}</Label>
                  <Select
                    items={currencyItems}
                    value={form.currency}
                    onValueChange={(value) => updateField("currency", value ?? "ETB")}
                  >
                    <SelectTrigger id="fare-plan-currency" className={selectTriggerClassName}>
                      <SelectValue placeholder={formCopy.currencyPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {currencyItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fare-plan-base-fare">{baseFareLabel}</Label>
                  <CurrencyInput
                    id="fare-plan-base-fare"
                    currency={form.currency}
                    value={form.baseFare}
                    onChange={(value) => updateField("baseFare", value)}
                    error={Boolean(fieldErrors.baseFare)}
                  />
                  {isHourly ? (
                    <p className="text-xs text-slate-500">{formCopy.perHourRateHelp}</p>
                  ) : null}
                  {fieldErrors.baseFare ? (
                    <p className="text-xs text-red-600">{fieldErrors.baseFare}</p>
                  ) : null}
                </div>

                {showPerKmRate ? (
                  <div className="space-y-2">
                    <Label htmlFor="fare-plan-per-km">{formCopy.perKmRate}</Label>
                    <CurrencyInput
                      id="fare-plan-per-km"
                      currency={form.currency}
                      value={form.perKmRate}
                      onChange={(value) => updateField("perKmRate", value)}
                      error={Boolean(fieldErrors.perKmRate)}
                    />
                    {fieldErrors.perKmRate ? (
                      <p className="text-xs text-red-600">{fieldErrors.perKmRate}</p>
                    ) : null}
                  </div>
                ) : null}

                {showPerMinuteRate ? (
                  <div className="space-y-2">
                    <Label htmlFor="fare-plan-per-minute">{formCopy.perMinuteRate}</Label>
                    <CurrencyInput
                      id="fare-plan-per-minute"
                      currency={form.currency}
                      value={form.perMinuteRate}
                      onChange={(value) => updateField("perMinuteRate", value)}
                      error={Boolean(fieldErrors.perMinuteRate)}
                    />
                    <p className="text-xs text-slate-500">{formCopy.perMinuteRateHelp}</p>
                    {fieldErrors.perMinuteRate ? (
                      <p className="text-xs text-red-600">{fieldErrors.perMinuteRate}</p>
                    ) : null}
                  </div>
                ) : null}

                {isHourly ? (
                  <div className="space-y-2">
                    <Label htmlFor="fare-plan-minimum-hours">{formCopy.minimumHours}</Label>
                    <Input
                      id="fare-plan-minimum-hours"
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.minimumHours}
                      onChange={(event) => updateField("minimumHours", event.target.value)}
                      className={cn(
                        fieldClassName,
                        fieldErrors.minimumHours && fieldErrorClassName,
                      )}
                    />
                    <p className="text-xs text-slate-500">{formCopy.minimumHoursHelp}</p>
                    {fieldErrors.minimumHours ? (
                      <p className="text-xs text-red-600">{fieldErrors.minimumHours}</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="fare-plan-minimum">{formCopy.minimumFare}</Label>
                    <CurrencyInput
                      id="fare-plan-minimum"
                      currency={form.currency}
                      value={form.minimumFare}
                      onChange={(value) => updateField("minimumFare", value)}
                      error={Boolean(fieldErrors.minimumFare)}
                    />
                    {fieldErrors.minimumFare ? (
                      <p className="text-xs text-red-600">{fieldErrors.minimumFare}</p>
                    ) : null}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fare-plan-booking-fee">{formCopy.bookingFee}</Label>
                  <CurrencyInput
                    id="fare-plan-booking-fee"
                    currency={form.currency}
                    value={form.bookingFee}
                    onChange={(value) => updateField("bookingFee", value)}
                    error={Boolean(fieldErrors.bookingFee)}
                  />
                  {fieldErrors.bookingFee ? (
                    <p className="text-xs text-red-600">{fieldErrors.bookingFee}</p>
                  ) : null}
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={Settings2}
              title={formCopy.sections.rules}
              description={formCopy.sections.rulesDescription}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fare-plan-priority">{formCopy.priority}</Label>
                  <Input
                    id="fare-plan-priority"
                    type="number"
                    min="0"
                    step="1"
                    value={form.priority}
                    onChange={(event) => updateField("priority", event.target.value)}
                    className={cn(fieldClassName, fieldErrors.priority && fieldErrorClassName)}
                  />
                  <p className="text-xs text-slate-500">{formCopy.priorityHelp}</p>
                  {fieldErrors.priority ? (
                    <p className="text-xs text-red-600">{fieldErrors.priority}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fare-plan-waiting">{formCopy.freeWaitingMinutes}</Label>
                  <Input
                    id="fare-plan-waiting"
                    type="number"
                    min="0"
                    step="1"
                    value={form.freeWaitingMinutes}
                    onChange={(event) => updateField("freeWaitingMinutes", event.target.value)}
                    className={cn(
                      fieldClassName,
                      fieldErrors.freeWaitingMinutes && fieldErrorClassName,
                    )}
                  />
                  <p className="text-xs text-slate-500">{formCopy.freeWaitingMinutesHelp}</p>
                  {fieldErrors.freeWaitingMinutes ? (
                    <p className="text-xs text-red-600">{fieldErrors.freeWaitingMinutes}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fare-plan-waiting-fee">{formCopy.waitingFeePerMinute}</Label>
                  <CurrencyInput
                    id="fare-plan-waiting-fee"
                    currency={form.currency}
                    value={form.waitingFeePerMinute}
                    onChange={(value) => updateField("waitingFeePerMinute", value)}
                    error={Boolean(fieldErrors.waitingFeePerMinute)}
                  />
                  <p className="text-xs text-slate-500">{formCopy.waitingFeePerMinuteHelp}</p>
                  {fieldErrors.waitingFeePerMinute ? (
                    <p className="text-xs text-red-600">{fieldErrors.waitingFeePerMinute}</p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#f8fafb] px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900">{formCopy.isActiveTitle}</p>
                  <p className="text-xs text-slate-500">
                    {form.isActive ? formCopy.isActiveOn : formCopy.isActiveOff}
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => updateField("isActive", checked)}
                />
              </div>
            </FormSection>
          </div>

          <SheetFooter className="mt-auto border-t border-slate-200 px-6 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {formCopy.cancel}
            </Button>
            <Button
              type="submit"
              className={adminPrimaryButtonClass}
              disabled={submitting || loading}
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
        </form>
      </SheetContent>
    </Sheet>
  );
}
