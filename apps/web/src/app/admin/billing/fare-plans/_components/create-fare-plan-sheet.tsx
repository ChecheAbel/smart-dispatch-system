"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Calculator,
  CalendarClock,
  CarFront,
  Check,
  ChevronDown,
  Clock,
  Coins,
  Gauge,
  Info,
  Languages,
  Layers,
  MapPin,
  Milestone,
  Receipt,
  Settings2,
  Sliders,
  Sparkles,
  Timer,
  Zap,
} from "lucide-react";
import type {
  FarePlan,
  PricingModel,
  Region,
  VehicleType,
  VehicleClass,
} from "@smart-dispatch/types";
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
  adminErrorMessageClass,
  adminFieldErrorClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminInputGroupErrorClass,
  adminLabelErrorClass,
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
  "distance_time",
  "distance",
  "time",
  "flat",
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
const fieldErrorClassName = adminFieldErrorClass;
const selectTriggerClassName = cn(fieldClassName, "w-full transition-all hover:border-slate-300 dark:hover:border-slate-600");
const textareaClassName =
  "flex min-h-[90px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-border dark:bg-muted/55 dark:text-foreground";

function getPricingModelMeta(isAm: boolean): Record<
  PricingModel,
  {
    icon: typeof Gauge;
    formula: string;
    subtitle: string;
  }
> {
  return {
    distance_time: {
      icon: Gauge,
      formula: isAm ? "መሰረታዊ + (ኪ.ሜ × ዋጋ) + (ደቂቃ × ዋጋ)" : "Base + (km × rate) + (min × rate)",
      subtitle: isAm
        ? "ለከተማ ታክሲ ጉዞዎች ርቀት እና የቆይታ ጊዜ የተጣመሩበት።"
        : "Distance & duration combined for urban taxi rides.",
    },
    distance: {
      icon: Milestone,
      formula: isAm ? "መሰረታዊ + (ኪ.ሜ × ዋጋ)" : "Base + (km × rate)",
      subtitle: isAm ? "በተሸፈነው ርቀት ብቻ የሚወሰን ክፍያ።" : "Fare driven strictly by distance covered.",
    },
    time: {
      icon: Clock,
      formula: isAm ? "መሰረታዊ + (ደቂቃ × ዋጋ)" : "Base + (min × rate)",
      subtitle: isAm ? "በወሰደው የጉዞ ጊዜ የሚወሰን ክፍያ።" : "Fare driven by elapsed trip duration.",
    },
    flat: {
      icon: Coins,
      formula: isAm ? "ቋሚ የተወሰነ ዋጋ" : "Fixed Flat Amount",
      subtitle: isAm
        ? "ርቀት ወይም ጊዜ ሳይታይ የተረጋገጠ ቋሚ ዋጋ።"
        : "Guaranteed single rate regardless of distance/time.",
    },
    hourly: {
      icon: CalendarClock,
      formula: isAm ? "የሰዓት ዋጋ × ሰዓታት" : "Hourly Rate × Hours",
      subtitle: isAm
        ? "ከዝቅተኛ የቦታ ማስያዣ ሰዓት ጋር በሰዓት የሚሰላ።"
        : "Billed per hour with minimum booking duration.",
    },
  };
}

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
    <Card className={cn(adminCardClass, "group gap-0 overflow-hidden rounded-xl border border-slate-200/90 py-0 shadow-sm transition-all duration-200 hover:border-slate-300/90 dark:border-border")}>
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 dark:border-border/60 dark:bg-muted/20">
        <div className={cn(adminIconBoxClass, "size-8 shrink-0 p-0 flex items-center justify-center rounded-lg")}>
          <Icon className="size-4 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
        </div>
        <div>
          <p className={cn("text-sm font-semibold tracking-tight", adminHeadingClass)}>{title}</p>
          <p className="text-xs text-slate-500 dark:text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="space-y-4 px-5 py-4">{children}</div>
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
  unitSuffix,
  placeholder = "0.00",
}: {
  id: string;
  currency: string;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  min?: string;
  step?: string;
  unitSuffix?: string;
  placeholder?: string;
}) {
  const currencyCode = currency.trim().toUpperCase() || "ETB";

  return (
    <div
      className={cn(
        "group flex items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-150 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 dark:border-border dark:bg-muted/50",
        error &&
          "border-red-300 bg-red-50/60 focus-within:border-red-400 focus-within:ring-red-200/60 dark:border-red-500/50 dark:bg-red-950/20",
      )}
    >
      <span
        aria-hidden
        className="flex h-10 shrink-0 items-center border-r border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold uppercase tracking-wider text-slate-600 tabular-nums dark:border-border dark:bg-muted/70 dark:text-muted-foreground"
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
        placeholder={placeholder}
        className={cn(
          "h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium tabular-nums shadow-none focus-visible:ring-0",
          error && "text-red-900 placeholder:text-red-400 dark:text-red-200",
        )}
      />
      {unitSuffix ? (
        <span
          aria-hidden
          className="flex h-10 shrink-0 items-center border-l border-slate-100 bg-slate-50/40 px-2.5 text-xs font-medium text-slate-500 dark:border-border dark:bg-muted/40 dark:text-muted-foreground"
        >
          {unitSuffix}
        </span>
      ) : null}
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
  const isAm = locale === "am";
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

  // UI state for language tab
  const [activeLangTab, setActiveLangTab] = useState<"en" | "am">("en");

  // UI state for Live Fare Simulator
  const [showSimulator, setShowSimulator] = useState(false);
  const [simDistance, setSimDistance] = useState<number>(5);
  const [simDuration, setSimDuration] = useState<number>(15);
  const [simWaiting, setSimWaiting] = useState<number>(5);
  const [simHours, setSimHours] = useState<number>(2);

  const pricingModelMeta = useMemo(() => getPricingModelMeta(isAm), [isAm]);

  const simUi = useMemo(
    () => ({
      title: isAm ? "የቀጥታ የክፍያ ማስመሰያ እና ቅድመ-እይታ" : "Live Fare Simulator & Preview",
      subtitle: isAm
        ? "ተመኖችን ሲያስተካክሉ የጉዞ ስሌቶችን ወዲያውኑ ይሞክሩ"
        : "Test trip calculations reactively as you adjust rates",
      toggle: showSimulator ? (isAm ? "አሳንስ" : "Collapse") : (isAm ? "ዘርጋ" : "Expand"),
      duration: isAm ? "የቆይታ ጊዜ፦" : "Duration:",
      hours: isAm ? "ሰዓታት" : "Hours",
      distance: isAm ? "ርቀት" : "Distance",
      time: isAm ? "ጊዜ" : "Time",
      waiting: isAm ? "መጠባበቂያ" : "Waiting",
      km: isAm ? "ኪ.ሜ" : "km",
      min: isAm ? "ደቂቃ" : "min",
      baseOrFlat: isAm ? "መሰረታዊ / ቋሚ" : "Base / Flat",
      billedHours: isAm ? "የተሰላ ሰዓታት" : "Billed Hours",
      distanceCost: isAm ? "የርቀት ወጪ" : "Distance Cost",
      durationCost: isAm ? "የጊዜ ወጪ" : "Duration Cost",
      bookingFee: isAm ? "የቦታ ማስያዣ ክፍያ" : "Booking Fee",
      estimatedFare: isAm ? "የተገመተ የናሙና ክፍያ፦" : "Estimated Sample Fare:",
      clampedFloor: (cur: string, fee: string) =>
        isAm ? `(በዝቅተኛ ገደብ ተወስኗል፦ ${cur} ${fee})` : `(Clamped to Minimum Floor: ${cur} ${fee})`,
    }),
    [isAm, showSimulator],
  );

  const unitLabels = useMemo(
    () => ({
      perKm: isAm ? "/ ኪ.ሜ" : "/ km",
      perMin: isAm ? "/ ደቂቃ" : "/ min",
      perHr: isAm ? "/ ሰዓት" : "/ hr",
      flat: isAm ? "ቋሚ" : "flat",
      base: isAm ? "መሰረታዊ" : "base",
      minFloor: isAm ? "ዝቅተኛ" : "min floor",
      perRide: isAm ? "በጉዞ" : "per ride",
      minsFree: isAm ? "ደቂቃ ነፃ" : "mins free",
      hoursMin: isAm ? "ሰዓታት ዝቅተኛ" : "hours min.",
      postGrace: isAm ? "ከነፃ ጊዜ በኋላ" : "Post-grace",
      serviceSurcharge: isAm ? "ተጨማሪ ክፍያ" : "Service surcharge",
      rentalDuration: isAm ? "የኪራይ ቆይታ" : "Rental duration",
      priceFloor: isAm ? "ዝቅተኛ ዋጋ" : "Price floor",
      per60Mins: isAm ? "በ60 ደቂቃ" : "Per 60 mins",
      singleCharge: isAm ? "አንድ ክፍያ" : "Single charge",
      initialFlagfall: isAm ? "የመነሻ ክፍያ" : "Initial flagfall",
    }),
    [isAm],
  );

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
      label: formCopy.currencies[code] ?? code,
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
      setActiveLangTab("en");
      setShowSimulator(false);
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

  // Live Fare Simulator Calculation
  const simulationCalculation = useMemo(() => {
    const cur = form.currency.trim().toUpperCase() || "ETB";
    const base = Number(form.baseFare) || 0;
    const kmRate = Number(form.perKmRate) || 0;
    const minRate = Number(form.perMinuteRate) || 0;
    const bookingFee = Number(form.bookingFee) || 0;
    const freeMins = Number(form.freeWaitingMinutes) || 0;
    const waitFeePerMin = Number(form.waitingFeePerMinute) || 0;
    const minFare = Number(form.minimumFare) || 0;
    const minHours = Number(form.minimumHours) || 0;

    let subtotal = 0;
    let distanceCharge = 0;
    let durationCharge = 0;
    let waitingCharge = 0;
    let effectiveHours = simHours;
    let minimumApplied = false;

    const billableWaitingMins = Math.max(0, simWaiting - freeMins);
    waitingCharge = billableWaitingMins * waitFeePerMin;

    if (form.pricingModel === "flat") {
      subtotal = base + bookingFee;
    } else if (form.pricingModel === "hourly") {
      effectiveHours = Math.max(simHours, minHours > 0 ? minHours : 1);
      const hourlyCharge = effectiveHours * base;
      subtotal = hourlyCharge + bookingFee;
    } else if (form.pricingModel === "distance") {
      distanceCharge = simDistance * kmRate;
      subtotal = base + distanceCharge + bookingFee + waitingCharge;
    } else if (form.pricingModel === "time") {
      durationCharge = simDuration * minRate;
      subtotal = base + durationCharge + bookingFee + waitingCharge;
    } else {
      // default: distance_time
      distanceCharge = simDistance * kmRate;
      durationCharge = simDuration * minRate;
      subtotal = base + distanceCharge + durationCharge + bookingFee + waitingCharge;
    }

    let total = subtotal;
    if (form.pricingModel !== "hourly" && minFare > 0 && subtotal < minFare) {
      total = minFare;
      minimumApplied = true;
    }

    return {
      cur,
      base,
      distanceCharge,
      durationCharge,
      waitingCharge,
      billableWaitingMins,
      bookingFee,
      subtotal: Math.round(subtotal * 100) / 100,
      total: Math.round(total * 100) / 100,
      minimumApplied,
      minFare,
      effectiveHours,
    };
  }, [
    form.pricingModel,
    form.currency,
    form.baseFare,
    form.perKmRate,
    form.perMinuteRate,
    form.bookingFee,
    form.freeWaitingMinutes,
    form.waitingFeePerMinute,
    form.minimumFare,
    form.minimumHours,
    simDistance,
    simDuration,
    simWaiting,
    simHours,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const enName = form.enName.trim();
    const amName = form.amName.trim();
    const nextErrors: FieldErrors = {};

    if (!enName) {
      nextErrors.enName = formCopy.errors.enNameRequired;
      setActiveLangTab("en");
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
        className="flex w-full flex-col gap-0 overflow-hidden border-l border-slate-200 bg-[#f8fafb] p-0 data-[side=right]:sm:max-w-2xl data-[side=right]:lg:max-w-3xl dark:border-border dark:bg-background"
      >
        {/* Top Gradient Banner & Header */}
        <div className="relative border-b border-slate-200 bg-white dark:border-border dark:bg-card">
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--brand-primary)] via-[#28574d] to-[var(--brand-accent)]" />
          <SheetHeader className="px-6 py-4 sm:px-7">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] ring-1 ring-[var(--brand-primary)]/20 dark:bg-accent">
                  <Coins className="size-5 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <SheetTitle className={cn("text-lg font-bold tracking-tight", adminHeadingClass)}>
                      {isEdit ? formCopy.editTitle : formCopy.createTitle}
                    </SheetTitle>
                  </div>
                  <SheetDescription className="text-xs text-slate-500 dark:text-muted-foreground">
                    {isEdit ? formCopy.editDescription : formCopy.createDescription}
                  </SheetDescription>
                </div>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-border dark:bg-card dark:text-muted-foreground">
                <div className="size-4 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
                {formCopy.loading}
              </div>
            ) : null}

            {error ? (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300">
                <Info className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                <div className="space-y-0.5">
                  <p className="font-semibold">{isAm ? "ክንውኑ አልተሳካም" : "Action Failed"}</p>
                  <p className="text-xs leading-relaxed">{error}</p>
                </div>
              </div>
            ) : null}

            {/* SECTION 1: Identity & Localization with Segmented Tabs */}
            <FormSection
              icon={Languages}
              title={formCopy.sections.identity}
              description={formCopy.sections.identityDescription}
            >
              {/* Language Switcher Tabs */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-border/60">
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-100/90 p-1 dark:bg-muted/60">
                  <button
                    type="button"
                    onClick={() => setActiveLangTab("en")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                      activeLangTab === "en"
                        ? "bg-white text-[var(--brand-primary)] shadow-sm dark:bg-card dark:text-foreground"
                        : "text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
                    )}
                  >
                    <span>English</span>
                    {form.enName.trim() ? (
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                    ) : null}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveLangTab("am")}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all",
                      activeLangTab === "am"
                        ? "bg-white text-[var(--brand-primary)] shadow-sm dark:bg-card dark:text-foreground"
                        : "text-slate-500 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground",
                    )}
                  >
                    <span>አማርኛ</span>
                    {form.amName.trim() ? (
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                    ) : null}
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 dark:text-muted-foreground">
                  {activeLangTab === "en"
                    ? (isAm ? "ዋና ስም (የግዴታ)" : "Primary Name (Required)")
                    : (isAm ? "የአማርኛ ትርጉም (አማራጭ)" : "Amharic Translation (Optional)")}
                </span>
              </div>

              {/* Active Tab Panel */}
              {activeLangTab === "en" ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="fare-plan-enName" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                        {formCopy.name} (English) <span className="text-red-500">*</span>
                      </Label>
                      <span className="text-[11px] text-slate-400">
                        {isAm ? "የግዴታ ዋና ስም" : "Required"}
                      </span>
                    </div>
                    <Input
                      id="fare-plan-enName"
                      value={form.enName}
                      onChange={(event) => updateField("enName", event.target.value)}
                      placeholder={formCopy.namePlaceholderEn}
                      className={cn(fieldClassName, fieldErrors.enName && fieldErrorClassName)}
                    />
                    {fieldErrors.enName ? (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.enName}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                        {isAm
                          ? "ለደንበኞች የሚታይ የታሪፍ ስም (ለምሳሌ \"መደበኛ የቀን ታክሲ\" ወይም \"የአየር ማረፊያ ፈጣን\")።"
                          : "Customer-facing fare name (e.g. \"Standard Daytime Taxi\" or \"Airport Shuttle Express\")."}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="fare-plan-enDescription" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                        {formCopy.description}
                      </Label>
                      <span className="text-[11px] text-slate-400">{formCopy.optional}</span>
                    </div>
                    <textarea
                      id="fare-plan-enDescription"
                      value={form.enDescription}
                      onChange={(event) => updateField("enDescription", event.target.value)}
                      placeholder={formCopy.descriptionPlaceholder}
                      className={textareaClassName}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="fare-plan-amName" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                        {formCopy.name} (አማርኛ)
                      </Label>
                      <span className="text-[11px] text-slate-400">{formCopy.optional}</span>
                    </div>
                    <Input
                      id="fare-plan-amName"
                      value={form.amName}
                      onChange={(event) => updateField("amName", event.target.value)}
                      placeholder={formCopy.namePlaceholderAm}
                      className={cn(fieldClassName, fieldErrors.amName && fieldErrorClassName)}
                    />
                    {fieldErrors.amName ? (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.amName}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                        {isAm
                          ? "የታሪፍ ዕቅድ ስም በአማርኛ (ለምሳሌ \"መደበኛ የቀን ታክሲ\")።"
                          : "Optional Amharic plan name (e.g. \"መደበኛ የቀን ታክሲ\")."}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="fare-plan-amDescription" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                        {formCopy.description} (አማርኛ)
                      </Label>
                      <span className="text-[11px] text-slate-400">{formCopy.optional}</span>
                    </div>
                    <textarea
                      id="fare-plan-amDescription"
                      value={form.amDescription}
                      onChange={(event) => updateField("amDescription", event.target.value)}
                      placeholder={isAm ? "የታሪፍ ዕቅድ ማብራሪያ በአማርኛ..." : "Optional Amharic description..."}
                      className={textareaClassName}
                    />
                  </div>
                </div>
              )}
            </FormSection>

            {/* SECTION 2: Pricing Model Selection with Interactive Cards */}
            <FormSection
              icon={Coins}
              title={formCopy.sections.pricing}
              description={formCopy.sections.pricingDescription}
            >
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-700 dark:text-foreground">
                  {formCopy.pricingModel} <span className="text-red-500">*</span>
                </Label>

                {/* Visual Grid of Model Cards */}
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {PRICING_MODELS.map((model) => {
                    const isSelected = form.pricingModel === model;
                    const meta = pricingModelMeta[model];
                    const ModelIcon = meta.icon;

                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={() => {
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
                        className={cn(
                          "relative flex flex-col items-start rounded-xl border p-3 text-left transition-all duration-200",
                          isSelected
                            ? "border-[var(--brand-primary)] bg-[color-mix(in_srgb,var(--brand-primary)_6%,white)] ring-2 ring-[var(--brand-primary)]/20 shadow-sm dark:border-[var(--brand-accent)] dark:bg-[color-mix(in_srgb,var(--brand-accent)_10%,transparent)] dark:ring-[var(--brand-accent)]/30"
                            : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-border dark:bg-card dark:hover:bg-muted/40",
                        )}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div
                            className={cn(
                              "flex size-7 items-center justify-center rounded-lg transition-colors",
                              isSelected
                                ? "bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f]"
                                : "bg-slate-100 text-slate-600 dark:bg-muted dark:text-muted-foreground",
                            )}
                          >
                            <ModelIcon className="size-3.5" />
                          </div>

                          {isSelected ? (
                            <span className="flex size-4 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f]">
                              <Check className="size-2.5" />
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2 text-xs font-bold text-slate-900 dark:text-foreground">
                          {copy.pricingModels[model]}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-slate-500 dark:text-muted-foreground">
                          {meta.subtitle}
                        </p>

                        <div className="mt-2.5 w-full border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400 dark:border-border/60">
                          <span className="font-mono text-[9px] text-slate-500 dark:text-muted-foreground">{meta.formula}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {fieldErrors.pricingModel ? (
                  <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.pricingModel}</p>
                ) : null}
              </div>

              {/* Currency & Base Fare Row */}
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="fare-plan-currency" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    {formCopy.currency}
                  </Label>
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
                  <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                    {isAm
                      ? "ለተሳፋሪ ደረሰኞች እና የክፍያ መጠየቂያዎች የሚያገለግል ገንዘብ።"
                      : "Billing currency applied to passenger receipts and invoice charges."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fare-plan-base-fare" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                      {baseFareLabel} <span className="text-red-500">*</span>
                    </Label>
                    <span className="text-[11px] text-slate-400">
                      {isHourly ? unitLabels.per60Mins : isFlat ? unitLabels.singleCharge : unitLabels.initialFlagfall}
                    </span>
                  </div>
                  <CurrencyInput
                    id="fare-plan-base-fare"
                    currency={form.currency}
                    value={form.baseFare}
                    onChange={(value) => updateField("baseFare", value)}
                    error={Boolean(fieldErrors.baseFare)}
                    unitSuffix={isHourly ? unitLabels.perHr : isFlat ? unitLabels.flat : unitLabels.base}
                    placeholder="0.00"
                  />
                  {fieldErrors.baseFare ? (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.baseFare}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                      {isHourly ? formCopy.perHourRateHelp : (isAm ? "ከተለዋዋጭ ርቀት/ጊዜ በፊት የሚሰላ የመነሻ መጠን።" : "Base starting amount before variable mileage/time.")}
                    </p>
                  )}
                </div>
              </div>

              {/* Dynamic Rates depending on Pricing Model */}
              <div className="grid gap-4 sm:grid-cols-2">
                {showPerKmRate ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="fare-plan-per-km" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                      {formCopy.perKmRate}
                    </Label>
                    <CurrencyInput
                      id="fare-plan-per-km"
                      currency={form.currency}
                      value={form.perKmRate}
                      onChange={(value) => updateField("perKmRate", value)}
                      error={Boolean(fieldErrors.perKmRate)}
                      unitSuffix={unitLabels.perKm}
                      placeholder="0.00"
                    />
                    {fieldErrors.perKmRate ? (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.perKmRate}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                        {isAm ? "በጉዞው ወቅት ለተጓዘው እያንዳንዱ ኪሎሜትር የሚጠየቅ።" : "Charged per kilometer traveled during the ride."}
                      </p>
                    )}
                  </div>
                ) : null}

                {showPerMinuteRate ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="fare-plan-per-minute" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                      {formCopy.perMinuteRate}
                    </Label>
                    <CurrencyInput
                      id="fare-plan-per-minute"
                      currency={form.currency}
                      value={form.perMinuteRate}
                      onChange={(value) => updateField("perMinuteRate", value)}
                      error={Boolean(fieldErrors.perMinuteRate)}
                      unitSuffix={unitLabels.perMin}
                      placeholder="0.00"
                    />
                    {fieldErrors.perMinuteRate ? (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.perMinuteRate}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                        {formCopy.perMinuteRateHelp}
                      </p>
                    )}
                  </div>
                ) : null}

                {isHourly ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="fare-plan-minimum-hours" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                        {formCopy.minimumHours}
                      </Label>
                      <span className="text-[11px] text-slate-400">{unitLabels.rentalDuration}</span>
                    </div>
                    <div
                      className={cn(
                        "flex items-center overflow-hidden rounded-lg border shadow-sm transition-colors",
                        fieldErrors.minimumHours
                          ? adminInputGroupErrorClass
                          : "border-slate-200 bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 dark:border-border dark:bg-muted/50",
                      )}
                    >
                      <Input
                        id="fare-plan-minimum-hours"
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.minimumHours}
                        onChange={(event) => updateField("minimumHours", event.target.value)}
                        placeholder="1.0"
                        aria-invalid={Boolean(fieldErrors.minimumHours)}
                        className={cn(
                          "h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium tabular-nums shadow-none focus-visible:ring-0",
                          fieldErrors.minimumHours && "text-red-900 placeholder:text-red-400 dark:text-red-200",
                        )}
                      />
                      <span
                        className={cn(
                          "flex h-10 shrink-0 items-center border-l px-3 text-xs font-medium",
                          fieldErrors.minimumHours
                            ? "border-red-200 bg-red-100/50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300"
                            : "border-slate-100 bg-slate-50/50 text-slate-500 dark:border-border dark:bg-muted/40 dark:text-muted-foreground",
                        )}
                      >
                        {unitLabels.hoursMin}
                      </span>
                    </div>
                    {fieldErrors.minimumHours ? (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.minimumHours}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                        {formCopy.minimumHoursHelp}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="fare-plan-minimum" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                        {formCopy.minimumFare}
                      </Label>
                      <span className="text-[11px] text-slate-400">{unitLabels.priceFloor}</span>
                    </div>
                    <CurrencyInput
                      id="fare-plan-minimum"
                      currency={form.currency}
                      value={form.minimumFare}
                      onChange={(value) => updateField("minimumFare", value)}
                      error={Boolean(fieldErrors.minimumFare)}
                      unitSuffix={unitLabels.minFloor}
                      placeholder="0.00"
                    />
                    {fieldErrors.minimumFare ? (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.minimumFare}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                        {isAm ? "የጉዞ ክፍያው ከዚህ መጠን በታች እንዳይወርድ ያረጋግጣል።" : "Guarantees the trip fare won't fall below this amount."}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fare-plan-booking-fee" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                      {formCopy.bookingFee}
                    </Label>
                    <span className="text-[11px] text-slate-400">{unitLabels.serviceSurcharge}</span>
                  </div>
                  <CurrencyInput
                    id="fare-plan-booking-fee"
                    currency={form.currency}
                    value={form.bookingFee}
                    onChange={(value) => updateField("bookingFee", value)}
                    error={Boolean(fieldErrors.bookingFee)}
                    unitSuffix={unitLabels.perRide}
                    placeholder="0.00"
                  />
                  {fieldErrors.bookingFee ? (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.bookingFee}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                      {isAm ? "በጠቅላላ ክፍያ ላይ የሚታከል ቋሚ የመድረክ ማስያዣ ክፍያ።" : "Fixed access or platform booking fee added to total."}
                    </p>
                  )}
                </div>
              </div>

              {/* LIVE FARE SIMULATOR PREVIEW */}
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-slate-50/80 via-white to-slate-50/50 p-3.5 shadow-sm dark:border-border dark:from-card dark:via-muted/20 dark:to-card">
                <div
                  className={cn(
                    "flex items-center justify-between cursor-pointer select-none",
                    showSimulator && "border-b border-slate-100 pb-3 dark:border-border/60",
                  )}
                  onClick={() => setShowSimulator((prev) => !prev)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f]">
                      <Calculator className="size-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-foreground">
                        {simUi.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                        {simUi.subtitle}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSimulator((prev) => !prev);
                    }}
                    className="h-7 px-2.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
                  >
                    <Sliders className="size-3 mr-1" />
                    {simUi.toggle}
                  </Button>
                </div>

                {showSimulator ? (
                  <div className="mt-3 space-y-3.5">
                    {/* Controls */}
                    <div className="grid grid-cols-3 gap-2.5">
                      {form.pricingModel === "hourly" ? (
                        <div className="col-span-3 space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-medium text-slate-600 dark:text-muted-foreground">{simUi.duration}</span>
                            <span className="font-semibold text-slate-900 dark:text-foreground">{simHours} {simUi.hours}</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
                            max="12"
                            step="0.5"
                            value={simHours}
                            onChange={(e) => setSimHours(Number(e.target.value))}
                            className="h-1.5 w-full cursor-pointer accent-[var(--brand-primary)] dark:accent-[var(--brand-accent)]"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-slate-600 dark:text-muted-foreground">{simUi.distance}</span>
                              <span className="font-bold text-slate-900 dark:text-foreground">{simDistance} {simUi.km}</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="50"
                              step="0.5"
                              value={simDistance}
                              onChange={(e) => setSimDistance(Number(e.target.value))}
                              disabled={form.pricingModel === "flat" || form.pricingModel === "time"}
                              className="h-1.5 w-full cursor-pointer accent-[var(--brand-primary)] disabled:opacity-40 dark:accent-[var(--brand-accent)]"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-slate-600 dark:text-muted-foreground">{simUi.time}</span>
                              <span className="font-bold text-slate-900 dark:text-foreground">{simDuration} {simUi.min}</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="90"
                              step="1"
                              value={simDuration}
                              onChange={(e) => setSimDuration(Number(e.target.value))}
                              disabled={form.pricingModel === "flat" || form.pricingModel === "distance"}
                              className="h-1.5 w-full cursor-pointer accent-[var(--brand-primary)] disabled:opacity-40 dark:accent-[var(--brand-accent)]"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-slate-600 dark:text-muted-foreground">{simUi.waiting}</span>
                              <span className="font-bold text-slate-900 dark:text-foreground">{simWaiting} {simUi.min}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              step="1"
                              value={simWaiting}
                              onChange={(e) => setSimWaiting(Number(e.target.value))}
                              disabled={form.pricingModel === "flat"}
                              className="h-1.5 w-full cursor-pointer accent-[var(--brand-primary)] disabled:opacity-40 dark:accent-[var(--brand-accent)]"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Breakdown & Result */}
                    <div className="rounded-lg bg-white p-3 border border-slate-200/70 dark:bg-card dark:border-border/70">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pb-2 border-b border-slate-100 dark:border-border/50">
                        <div>
                          <p className="text-slate-400">{simUi.baseOrFlat}</p>
                          <p className="font-semibold text-slate-800 dark:text-foreground">
                            {simulationCalculation.cur} {simulationCalculation.base.toFixed(2)}
                          </p>
                        </div>
                        {form.pricingModel === "hourly" ? (
                          <div>
                            <p className="text-slate-400">{simUi.billedHours}</p>
                            <p className="font-semibold text-slate-800 dark:text-foreground">
                              {simulationCalculation.effectiveHours}h
                            </p>
                          </div>
                        ) : (
                          <>
                            <div>
                              <p className="text-slate-400">{simUi.distanceCost}</p>
                              <p className="font-semibold text-slate-800 dark:text-foreground">
                                {simulationCalculation.cur} {simulationCalculation.distanceCharge.toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">{simUi.durationCost}</p>
                              <p className="font-semibold text-slate-800 dark:text-foreground">
                                {simulationCalculation.cur} {simulationCalculation.durationCharge.toFixed(2)}
                              </p>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="text-slate-400">{simUi.bookingFee}</p>
                          <p className="font-semibold text-slate-800 dark:text-foreground">
                            {simulationCalculation.cur} {simulationCalculation.bookingFee.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
                            {simUi.estimatedFare}
                          </span>
                          {simulationCalculation.minimumApplied ? (
                            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              {simUi.clampedFloor(simulationCalculation.cur, simulationCalculation.minFare.toFixed(2))}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-bold text-slate-400">{simulationCalculation.cur}</span>
                          <span className="text-xl font-black tracking-tight text-[var(--brand-primary)] dark:text-[var(--brand-accent)]">
                            {simulationCalculation.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </FormSection>

            {/* SECTION 3: Applicable Target Scope (Vehicle & Region) */}
            <FormSection
              icon={MapPin}
              title={formCopy.sections.scope}
              description={formCopy.sections.scopeDescription}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    {formCopy.vehicleType}
                  </Label>
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
                  <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                    {isAm ? "በተሽከርካሪ አይነት ይለዩ (ለምሳሌ ሴዳን፣ ቫን)።" : "Filter by body/vehicle type (e.g. Sedan, Van)."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    {formCopy.vehicleClass}
                  </Label>
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
                  <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                    {isAm ? "በአገልግሎት ክፍል ይለዩ (ለምሳሌ ኢኮኖሚ፣ ቪአይፒ)።" : "Filter by service class (e.g. Economy, VIP)."}
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    {formCopy.region}
                  </Label>
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
                  <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                    {isAm ? "የዞን ወይም የከተማ ወሰን ክልል።" : "Zone or city boundary scope."}
                  </p>
                </div>
              </div>
            </FormSection>

            {/* SECTION 4: Rules, Waiting & Dispatch Priority */}
            <FormSection
              icon={Settings2}
              title={formCopy.sections.rules}
              description={formCopy.sections.rulesDescription}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fare-plan-priority" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                    {formCopy.priority} <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fare-plan-priority"
                    type="number"
                    min="0"
                    step="1"
                    value={form.priority}
                    onChange={(event) => updateField("priority", event.target.value)}
                    className={cn(fieldClassName, fieldErrors.priority && fieldErrorClassName)}
                  />
                  {fieldErrors.priority ? (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.priority}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                      {formCopy.priorityHelp}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fare-plan-waiting" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                      {formCopy.freeWaitingMinutes}
                    </Label>
                    <Timer className="size-3 text-slate-400" />
                  </div>
                  <div
                    className={cn(
                      "flex items-center overflow-hidden rounded-lg border shadow-sm transition-colors",
                      fieldErrors.freeWaitingMinutes
                        ? adminInputGroupErrorClass
                        : "border-slate-200 bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 dark:border-border dark:bg-muted/50",
                    )}
                  >
                    <Input
                      id="fare-plan-waiting"
                      type="number"
                      min="0"
                      step="1"
                      value={form.freeWaitingMinutes}
                      onChange={(event) => updateField("freeWaitingMinutes", event.target.value)}
                      aria-invalid={Boolean(fieldErrors.freeWaitingMinutes)}
                      className={cn(
                        "h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium tabular-nums shadow-none focus-visible:ring-0",
                        fieldErrors.freeWaitingMinutes && "text-red-900 placeholder:text-red-400 dark:text-red-200",
                      )}
                    />
                    <span
                      className={cn(
                        "flex h-10 shrink-0 items-center border-l px-2.5 text-xs font-medium",
                        fieldErrors.freeWaitingMinutes
                          ? "border-red-200 bg-red-100/50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300"
                          : "border-slate-100 bg-slate-50/50 text-slate-500 dark:border-border dark:bg-muted/40 dark:text-muted-foreground",
                      )}
                    >
                      {unitLabels.minsFree}
                    </span>
                  </div>
                  {fieldErrors.freeWaitingMinutes ? (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.freeWaitingMinutes}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                      {formCopy.freeWaitingMinutesHelp}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="fare-plan-waiting-fee" className="text-xs font-semibold text-slate-700 dark:text-foreground">
                      {formCopy.waitingFeePerMinute}
                    </Label>
                    <span className="text-[11px] text-slate-400">{unitLabels.postGrace}</span>
                  </div>
                  <CurrencyInput
                    id="fare-plan-waiting-fee"
                    currency={form.currency}
                    value={form.waitingFeePerMinute}
                    onChange={(value) => updateField("waitingFeePerMinute", value)}
                    error={Boolean(fieldErrors.waitingFeePerMinute)}
                    unitSuffix={unitLabels.perMin}
                    placeholder="0.00"
                  />
                  {fieldErrors.waitingFeePerMinute ? (
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">{fieldErrors.waitingFeePerMinute}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                      {formCopy.waitingFeePerMinuteHelp}
                    </p>
                  )}
                </div>
              </div>

              {/* Active Toggle Card */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50 px-4 py-3 dark:border-border dark:bg-card">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg transition-colors",
                      form.isActive
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-slate-100 text-slate-500 dark:bg-muted dark:text-muted-foreground",
                    )}
                  >
                    <Zap className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-foreground">{formCopy.isActiveTitle}</p>
                    <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                      {form.isActive ? formCopy.isActiveOn : formCopy.isActiveOff}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => updateField("isActive", checked)}
                />
              </div>
            </FormSection>
          </div>

          {/* Sticky Sheet Footer */}
          <SheetFooter className="mt-auto flex-row items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shadow-sm sm:px-7 dark:border-border dark:bg-card">
            {/* Quick summary pill */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-muted-foreground">
              <span className="font-semibold text-slate-700 dark:text-foreground">
                {copy.pricingModels[form.pricingModel as PricingModel] || (isAm ? "የታሪፍ ዕቅድ" : "Fare Plan")}
              </span>
              <span>·</span>
              <span className="font-mono uppercase font-medium">{form.currency || "ETB"}</span>
              {form.baseFare ? (
                <>
                  <span>·</span>
                  <span className="font-medium">
                    {isAm ? `መሰረታዊ፦ ${form.baseFare} ${form.currency}` : `Base: ${form.baseFare} ${form.currency}`}
                  </span>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10 px-4 rounded-lg font-medium text-slate-700 hover:bg-slate-50 dark:border-border dark:text-foreground dark:hover:bg-muted"
              >
                {formCopy.cancel}
              </Button>
              <Button
                type="submit"
                className={cn(adminPrimaryButtonClass, "min-w-[130px] font-semibold")}
                disabled={submitting || loading}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black dark:border-t-transparent" />
                    {isEdit ? formCopy.saving : formCopy.creating}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    {isEdit ? formCopy.save : formCopy.create}
                    <ArrowRight className="size-3.5" />
                  </span>
                )}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
