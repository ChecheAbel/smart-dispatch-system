"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  CalendarClock,
  CalendarX,
  Check,
  ClipboardList,
  Clock,
  Coins,
  Info,
  Loader2,
  Receipt,
  RotateCcw,
  Save,
  UserX,
} from "lucide-react";
import type { LateCancellationType } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminCardClass,
  adminErrorMessageClass,
  adminFieldErrorClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputGroupErrorClass,
  adminLabelErrorClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  createBookingPolicy,
  fetchBookingPolicies,
  fetchBookingPolicyById,
  updateBookingPolicy,
} from "@/lib/booking-policy-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getAdminBookingPoliciesMessages } from "@/translations";

const LATE_CANCELLATION_TYPES: LateCancellationType[] = ["none", "charge_fee", "bill_as_trip"];
const CURRENCY_CODES = ["ETB", "USD", "EUR", "GBP"] as const;

const DEFAULT_POLICY_TRANSLATIONS = [
  { locale: "en", name: "Default booking policy", description: null },
  { locale: "am", name: "ነባሪ የቦታ ማስያዝ ፖሊሲ", description: null },
];

type BookingPolicyFormState = {
  minAdvanceBookingHours: string;
  maxAdvanceBookingHours: string;
  freeCancellationHours: string;
  lateCancellationType: LateCancellationType;
  lateCancellationFee: string;
  noShowType: LateCancellationType;
  noShowFee: string;
  currency: string;
};

type FieldErrors = Partial<Record<keyof BookingPolicyFormState, string>>;

const emptyForm: BookingPolicyFormState = {
  minAdvanceBookingHours: "24",
  maxAdvanceBookingHours: "720",
  freeCancellationHours: "24",
  lateCancellationType: "none",
  lateCancellationFee: "",
  noShowType: "none",
  noShowFee: "",
  currency: "ETB",
};

function getBookingPoliciesUiStrings(isAm: boolean) {
  return {
    formatHours: (hoursStr: string) => {
      const num = Number(hoursStr);
      if (!Number.isFinite(num) || num <= 0) return "";
      if (num < 24) {
        return isAm ? `${num} ሰዓት` : `${num} ${num === 1 ? "hour" : "hours"}`;
      }
      const days = Math.round((num / 24) * 10) / 10;
      return isAm ? `${days} ቀን` : `${days} ${days === 1 ? "day" : "days"}`;
    },
    currencies: {
      ETB: isAm ? "ETB – የኢትዮጵያ ብር" : "ETB – Ethiopian Birr",
      USD: isAm ? "USD – የአሜሪካ ዶላር ($)" : "USD – US Dollar ($)",
      EUR: isAm ? "EUR – ዩሮ (€)" : "EUR – Euro (€)",
      GBP: isAm ? "GBP – የብሪታንያ ፓውንድ (£)" : "GBP – British Pound (£)",
    } as Record<string, string>,
    baseCurrency: {
      title: isAm ? "የመሠረታዊ ፖሊሲ ምንዛሬ" : "Base Policy Currency",
      description: isAm
        ? "በሁሉም የስረዛ ቅጣቶች፣ የተሳፋሪ አለመታየት ክፍያዎች እና ተመላሾች ላይ የሚተገበር መደበኛ የሂሳብ ምንዛሬ።"
        : "Standard billing currency applied to all cancellation penalties, passenger no-show fees, and refunds.",
      placeholder: isAm ? "ምንዛሬ ይምረጡ" : "Select currency",
    },
    timeline: {
      title: isAm ? "የፖሊሲ ሂደት የጊዜ መስመር" : "Policy Journey Timeline",
      subtitle: isAm
        ? "የተሳፋሪ ማስያዣ ማስታወቂያ፣ ነፃ መሰረዝ እና ቅጣቶች በስምሪት ውስጥ እንዴት እንደሚተገበሩ"
        : "How passenger booking notice, free cancellation, and penalties execute in dispatch",
      advanceNotice: isAm ? "የቅድመ ማስያዣ ማስታወቂያ" : "Advance Notice",
      advanceNoticeRange: (min: string, max: string) =>
        isAm
          ? `ቦታ ከመውሰድ በፊት በ${min} እና በ${max} መካከል።`
          : `Between ${min} and ${max} before pickup.`,
      freeCancellation: isAm ? "ነፃ መሰረዝ" : "Free Cancellation",
      upToHours: (h: string) => (isAm ? `ቦታ ከመውሰድ እስከ ${h}ሰ በፊት` : `Up to ${h}h before`),
      lateNone: isAm ? "ዘግይቶ መሰረዝ፦ ቅጣት የለም" : "Late cancellation: No penalty",
      lateFee: (cur: string, fee: string) =>
        isAm ? `የዘግይቶ ክፍያ፦ ${cur} ${fee}` : `Late fee: ${cur} ${fee}`,
      lateTrip: isAm ? "ዘግይቶ መሰረዝ፦ ሙሉ ጉዞ ይከፈላል" : "Late cancellation: Full trip billed",
      noShow: isAm ? "ተሳፋሪ አለመታየት" : "Passenger No-Show",
      noShowNone: isAm ? "ተሳፋሪው ያለ ምንም ቅጣት ጉዞውን መተው ይችላል።" : "Passenger can miss ride with zero penalty.",
      noShowFee: (cur: string, fee: string) =>
        isAm ? `ያለመታየት ክፍያ፦ ${cur} ${fee}` : `No-show fee: ${cur} ${fee}`,
      noShowTrip: isAm ? "አሽከርካሪው ሲደርስ ሙሉ የጉዞ ክፍያ ይጠየቃል።" : "Full ride fare billed upon driver arrival.",
    },
    sections: {
      advance: {
        title: isAm ? "የቅድመ ማስያዣ ገደቦች" : "Advance Booking Limits",
        description: isAm
          ? "ስምሪት አሽከርካሪ ከመመደቡ በፊት የሚያስፈልገውን የማስያዣ ማስታወቂያ ጊዜ ይወስኑ።"
          : "Define the booking notice window required before dispatch can schedule a driver.",
        hoursNotice: isAm ? "ሰዓት ማስታወቂያ" : "hours notice",
        hoursMax: isAm ? "ከፍተኛ ሰዓታት" : "hours max",
        presets: isAm ? "ቅድመ-ቅምጦች:" : "Presets:",
        presetsList: [
          { label: isAm ? "12ሰ" : "12h", value: "12" },
          { label: isAm ? "24ሰ (1ቀ)" : "24h (1d)", value: "24" },
          { label: isAm ? "48ሰ (2ቀ)" : "48h (2d)", value: "48" },
        ],
        maxPresetsList: [
          { label: isAm ? "7 ቀናት (168ሰ)" : "7 Days (168h)", value: "168" },
          { label: isAm ? "30 ቀናት (720ሰ)" : "30 Days (720h)", value: "720" },
          { label: isAm ? "90 ቀናት (2160ሰ)" : "90 Days (2160h)", value: "2160" },
        ],
      },
      cancellation: {
        title: isAm ? "የስረዛ ፖሊሲ እና የነፃ ጊዜ ገደብ" : "Cancellation Policy & Grace Period",
        description: isAm
          ? "ነፃ መሰረዝ መቼ እንደሚያበቃ ይግለጹ እና ለመጨረሻ ሰዓት ስረዛዎች ቅጣቶችን ይወስኑ።"
          : "Specify when a passenger can cancel without penalty and how late cancellations are charged.",
        hoursPrior: isAm ? "ሰዓት ከመነሳት በፊት" : "hours prior",
        presets: isAm ? "ቅድመ-ቅምጦች:" : "Presets:",
        presetsList: [
          { label: isAm ? "6 ሰዓታት" : "6 Hours", value: "6" },
          { label: isAm ? "12 ሰዓታት" : "12 Hours", value: "12" },
          { label: isAm ? "24 ሰዓታት (1ቀ)" : "24 Hours (1d)", value: "24" },
          { label: isAm ? "48 ሰዓታት (2ቀ)" : "48 Hours (2d)", value: "48" },
        ],
        lateFeeHelp: (cur: string) =>
          isAm
            ? `ደንበኛው ከነፃ ጊዜ ገደብ በኋላ ሲሰርዝ በ${cur} የተቀነሰ ቋሚ ቅጣት።`
            : `Fixed penalty in ${cur} deducted when customer cancels past the grace period.`,
      },
      noShow: {
        title: isAm ? "የተሳፋሪ አለመታየት ፖሊሲ" : "Passenger No-Show Policy",
        description: isAm
          ? "አሽከርካሪው የመነሻ ቦታ ደርሶ ተሳፋሪው ሳይገኝ ሲቀር የሚጠየቁ የገንዘብ ቅጣቶችን ይወስኑ።"
          : "Determine the billing rule when a driver arrives at the pickup point but the passenger fails to appear.",
        noShowFeeHelp: (cur: string) =>
          isAm
            ? `ተሳፋሪው ለጉዞው ሳይገኝ ሲቀር በ${cur} የሚጠየቅ ቋሚ ቅጣት።`
            : `Fixed penalty in ${cur} charged when passenger does not appear for the ride.`,
      },
    },
    actionFailed: isAm ? "እርምጃው አልተሳካም" : "Action Failed",
    footer: {
      notice: isAm ? "ማስታወቂያ፦" : "Notice:",
      freeCancel: isAm ? "ነፃ ስረዛ፦" : "Free Cancel:",
      unsavedChanges: isAm ? "(ያልተቀመጡ ለውጦች)" : "(Unsaved changes)",
      reset: isAm ? "እንደገና አስጀምር" : "Reset",
    },
  };
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ClipboardList;
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
      <div className="space-y-5 px-5 py-5">{children}</div>
    </Card>
  );
}

function BookingPolicyFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className={cn(adminCardClass, "overflow-hidden rounded-xl border border-slate-200/90 p-5")}>
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <div className={cn(adminCardClass, "overflow-hidden rounded-xl border border-slate-200/90 p-5")}>
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function BookingPoliciesPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminBookingPoliciesMessages(locale);
  const formCopy = copy.form;
  const toastCopy = copy.toast;
  const canRead = hasPermission(PERMISSIONS.booking_policies.read);
  const canWrite = hasPermission(PERMISSIONS.booking_policies.write);

  const isAm = locale === "am";
  const ui = useMemo(() => getBookingPoliciesUiStrings(isAm), [isAm]);

  const [policyId, setPolicyId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingPolicyFormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<BookingPolicyFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(policyId);
  const showLateFeeField = form.lateCancellationType === "charge_fee";
  const showNoShowFeeField = form.noShowType === "charge_fee";
  const formDisabled = saving || loading || !canWrite;

  const isFormDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const currencyItems = useMemo(() => {
    const list: string[] = [...CURRENCY_CODES];
    if (form.currency && !list.includes(form.currency)) {
      list.push(form.currency);
    }
    return list.map((code) => ({
      value: code,
      label: ui.currencies[code] ?? code,
    }));
  }, [form.currency, ui.currencies]);

  useEffect(() => {
    if (!canRead) return;

    let cancelled = false;

    async function loadPolicy() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchBookingPolicies({ page: 1, limit: 1, locale });
        const existing = result.data[0];

        if (!existing) {
          if (!cancelled) {
            setPolicyId(null);
            setForm(emptyForm);
            setInitialForm(emptyForm);
          }
          return;
        }

        const policy = await fetchBookingPolicyById(existing.id, locale);
        if (!cancelled) {
          const loadedForm: BookingPolicyFormState = {
            minAdvanceBookingHours: String(policy.min_advance_booking_hours),
            maxAdvanceBookingHours: String(policy.max_advance_booking_hours),
            freeCancellationHours: String(policy.free_cancellation_hours),
            lateCancellationType: policy.late_cancellation_type,
            lateCancellationFee:
              policy.late_cancellation_fee != null
                ? String(policy.late_cancellation_fee)
                : "",
            noShowType: policy.no_show_type,
            noShowFee: policy.no_show_fee != null ? String(policy.no_show_fee) : "",
            currency: policy.currency,
          };
          setPolicyId(policy.id);
          setForm(loadedForm);
          setInitialForm(loadedForm);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : toastCopy.loadFailed.description;
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

    void loadPolicy();

    return () => {
      cancelled = true;
    };
  }, [canRead, locale, toastCopy.loadFailed.description, toastCopy.loadFailed.title]);

  function updateField<K extends keyof BookingPolicyFormState>(
    key: K,
    value: BookingPolicyFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setError(null);
  }

  function handleReset() {
    setForm(initialForm);
    setFieldErrors({});
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite) return;

    setError(null);
    setFieldErrors({});

    const nextErrors: FieldErrors = {};
    const minAdvance = form.minAdvanceBookingHours.trim();
    if (!minAdvance || !Number.isFinite(Number(minAdvance)) || Number(minAdvance) < 0) {
      nextErrors.minAdvanceBookingHours = formCopy.errors.hoursInvalid;
    }

    const maxAdvance = form.maxAdvanceBookingHours.trim();
    if (!maxAdvance || !Number.isFinite(Number(maxAdvance)) || Number(maxAdvance) < 0) {
      nextErrors.maxAdvanceBookingHours = formCopy.errors.hoursInvalid;
    } else if (
      minAdvance &&
      Number.isFinite(Number(minAdvance)) &&
      Number(maxAdvance) < Number(minAdvance)
    ) {
      nextErrors.maxAdvanceBookingHours = formCopy.errors.maxLessThanMin;
    }

    const freeCancel = form.freeCancellationHours.trim();
    if (!freeCancel || !Number.isFinite(Number(freeCancel)) || Number(freeCancel) < 0) {
      nextErrors.freeCancellationHours = formCopy.errors.hoursInvalid;
    }

    if (form.lateCancellationType === "charge_fee") {
      const fee = form.lateCancellationFee.trim();
      if (!fee || !Number.isFinite(Number(fee)) || Number(fee) < 0) {
        nextErrors.lateCancellationFee = formCopy.errors.feeRequired;
      }
    }

    if (form.noShowType === "charge_fee") {
      const fee = form.noShowFee.trim();
      if (!fee || !Number.isFinite(Number(fee)) || Number(fee) < 0) {
        nextErrors.noShowFee = formCopy.errors.noShowFeeRequired;
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const payload = {
      translations: DEFAULT_POLICY_TRANSLATIONS,
      min_advance_booking_hours: Number(minAdvance),
      max_advance_booking_hours: Number(maxAdvance),
      free_cancellation_hours: Number(freeCancel),
      late_cancellation_type: form.lateCancellationType,
      late_cancellation_fee:
        form.lateCancellationType === "charge_fee"
          ? Number(form.lateCancellationFee.trim())
          : null,
      no_show_type: form.noShowType,
      no_show_fee:
        form.noShowType === "charge_fee" ? Number(form.noShowFee.trim()) : null,
      currency: form.currency,
      is_active: true,
    };

    setSaving(true);

    try {
      const policy = policyId
        ? await updateBookingPolicy(policyId, payload)
        : await createBookingPolicy(payload);

      const savedForm: BookingPolicyFormState = {
        minAdvanceBookingHours: String(policy.min_advance_booking_hours),
        maxAdvanceBookingHours: String(policy.max_advance_booking_hours),
        freeCancellationHours: String(policy.free_cancellation_hours),
        lateCancellationType: policy.late_cancellation_type,
        lateCancellationFee:
          policy.late_cancellation_fee != null ? String(policy.late_cancellation_fee) : "",
        noShowType: policy.no_show_type,
        noShowFee: policy.no_show_fee != null ? String(policy.no_show_fee) : "",
        currency: policy.currency,
      };

      setPolicyId(policy.id);
      setForm(savedForm);
      setInitialForm(savedForm);

      showSuccessToast({
        title: policyId ? toastCopy.updateSuccess.title : toastCopy.createSuccess.title,
        description: policyId
          ? toastCopy.updateSuccess.description
          : toastCopy.createSuccess.description,
      });
    } catch (err) {
      const failedMessage = policyId
        ? formCopy.errors.updateFailed
        : formCopy.errors.createFailed;
      const message = err instanceof Error ? err.message : failedMessage;
      setError(message);
      showErrorToast({
        title: failedMessage,
        description: message,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="min-w-0 space-y-6">

      {loading ? (
        <BookingPolicyFormSkeleton />
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
          {error ? (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-300">
              <Info className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-0.5">
                <p className="font-semibold">{ui.actionFailed}</p>
                <p className="text-xs leading-relaxed">{error}</p>
              </div>
            </div>
          ) : null}

          {/* BASE BILLING CURRENCY CARD */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-border dark:bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className={cn(adminIconBoxClass, "size-10 flex items-center justify-center rounded-xl shrink-0")}>
                  <Coins className="size-5 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-foreground">
                      {ui.baseCurrency.title}
                    </h2>
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800 dark:bg-muted dark:text-foreground">
                      {form.currency}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-muted-foreground">
                    {ui.baseCurrency.description}
                  </p>
                </div>
              </div>

              {/* Currency Dropdown */}
              <div className="w-full sm:w-60 shrink-0">
                <Select
                  items={currencyItems}
                  value={form.currency}
                  onValueChange={(value) => updateField("currency", value ?? "ETB")}
                  disabled={formDisabled}
                >
                  <SelectTrigger
                    id="booking-policy-base-currency"
                    className="h-10 w-full bg-white font-medium shadow-none dark:bg-muted/40"
                  >
                    <SelectValue placeholder={ui.baseCurrency.placeholder} />
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
            </div>
          </div>

          {/* POLICY LIFECYCLE TIMELINE PREVIEW */}
          <div className="rounded-xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-white to-slate-50 p-4 shadow-sm dark:border-border dark:from-card dark:via-muted/20 dark:to-card">
            <p className="text-xs font-bold text-slate-900 dark:text-foreground">
              {ui.timeline.title}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
              {ui.timeline.subtitle}
            </p>

            <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-border/60 dark:bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-foreground">
                  <Clock className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{ui.timeline.advanceNotice}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-foreground">
                  {form.minAdvanceBookingHours}h – {form.maxAdvanceBookingHours}h
                </p>
                <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                  {ui.timeline.advanceNoticeRange(
                    ui.formatHours(form.minAdvanceBookingHours) || "0h",
                    ui.formatHours(form.maxAdvanceBookingHours) || "0h",
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-border/60 dark:bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-foreground">
                  <CalendarX className="size-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{ui.timeline.freeCancellation}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-foreground">
                  {ui.timeline.upToHours(form.freeCancellationHours)}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                  {form.lateCancellationType === "none"
                    ? ui.timeline.lateNone
                    : form.lateCancellationType === "charge_fee"
                      ? ui.timeline.lateFee(form.currency, form.lateCancellationFee || "0")
                      : ui.timeline.lateTrip}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200/70 bg-white p-3 dark:border-border/60 dark:bg-card">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-foreground">
                  <UserX className="size-3.5 text-red-600 dark:text-red-400" />
                  <span>{ui.timeline.noShow}</span>
                </div>
                <p className="mt-1 text-sm font-bold text-slate-900 dark:text-foreground">
                  {copy.noShowTypes[form.noShowType]}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                  {form.noShowType === "none"
                    ? ui.timeline.noShowNone
                    : form.noShowType === "charge_fee"
                      ? ui.timeline.noShowFee(form.currency, form.noShowFee || "0")
                      : ui.timeline.noShowTrip}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 1: Advance Booking Limits */}
          <SectionCard
            icon={CalendarClock}
            title={ui.sections.advance.title}
            description={ui.sections.advance.description}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Minimum Advance Booking */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="booking-policy-min-advance"
                    className={cn(
                      "text-xs font-semibold text-slate-700 dark:text-foreground",
                      fieldErrors.minAdvanceBookingHours && adminLabelErrorClass,
                    )}
                  >
                    {formCopy.minAdvanceBookingHours} <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
                    {ui.formatHours(form.minAdvanceBookingHours)}
                  </span>
                </div>

                <div
                  className={cn(
                    "flex items-center overflow-hidden rounded-lg border shadow-sm transition-colors",
                    fieldErrors.minAdvanceBookingHours
                      ? adminInputGroupErrorClass
                      : "border-slate-200 bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 dark:border-border dark:bg-muted/50",
                  )}
                >
                  <Input
                    id="booking-policy-min-advance"
                    type="number"
                    min={0}
                    value={form.minAdvanceBookingHours}
                    onChange={(event) =>
                      updateField("minAdvanceBookingHours", event.target.value)
                    }
                    placeholder={formCopy.hoursPlaceholder}
                    disabled={formDisabled}
                    aria-invalid={Boolean(fieldErrors.minAdvanceBookingHours)}
                    className={cn(
                      "h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium tabular-nums shadow-none focus-visible:ring-0",
                      fieldErrors.minAdvanceBookingHours && "text-red-900 placeholder:text-red-400 dark:text-red-200",
                    )}
                  />
                  <span
                    className={cn(
                      "flex h-10 shrink-0 items-center border-l px-3 text-xs font-medium",
                      fieldErrors.minAdvanceBookingHours
                        ? "border-red-200 bg-red-100/50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300"
                        : "border-slate-100 bg-slate-50/50 text-slate-500 dark:border-border dark:bg-muted/40 dark:text-muted-foreground",
                    )}
                  >
                    {ui.sections.advance.hoursNotice}
                  </span>
                </div>

                {/* Preset shortcuts */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400">{ui.sections.advance.presets}</span>
                  {ui.sections.advance.presetsList.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      disabled={formDisabled}
                      onClick={() => updateField("minAdvanceBookingHours", preset.value)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                        form.minAdvanceBookingHours === preset.value
                          ? "bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f]"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted/80",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                  {formCopy.minAdvanceBookingHoursHint}
                </p>
                {fieldErrors.minAdvanceBookingHours ? (
                  <p className={adminErrorMessageClass}>
                    {fieldErrors.minAdvanceBookingHours}
                  </p>
                ) : null}
              </div>

              {/* Maximum Advance Booking */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="booking-policy-max-advance"
                    className={cn(
                      "text-xs font-semibold text-slate-700 dark:text-foreground",
                      fieldErrors.maxAdvanceBookingHours && adminLabelErrorClass,
                    )}
                  >
                    {formCopy.maxAdvanceBookingHours} <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
                    {ui.formatHours(form.maxAdvanceBookingHours)}
                  </span>
                </div>

                <div
                  className={cn(
                    "flex items-center overflow-hidden rounded-lg border shadow-sm transition-colors",
                    fieldErrors.maxAdvanceBookingHours
                      ? adminInputGroupErrorClass
                      : "border-slate-200 bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 dark:border-border dark:bg-muted/50",
                  )}
                >
                  <Input
                    id="booking-policy-max-advance"
                    type="number"
                    min={0}
                    value={form.maxAdvanceBookingHours}
                    onChange={(event) =>
                      updateField("maxAdvanceBookingHours", event.target.value)
                    }
                    placeholder={formCopy.maxHoursPlaceholder}
                    disabled={formDisabled}
                    aria-invalid={Boolean(fieldErrors.maxAdvanceBookingHours)}
                    className={cn(
                      "h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium tabular-nums shadow-none focus-visible:ring-0",
                      fieldErrors.maxAdvanceBookingHours && "text-red-900 placeholder:text-red-400 dark:text-red-200",
                    )}
                  />
                  <span
                    className={cn(
                      "flex h-10 shrink-0 items-center border-l px-3 text-xs font-medium",
                      fieldErrors.maxAdvanceBookingHours
                        ? "border-red-200 bg-red-100/50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300"
                        : "border-slate-100 bg-slate-50/50 text-slate-500 dark:border-border dark:bg-muted/40 dark:text-muted-foreground",
                    )}
                  >
                    {ui.sections.advance.hoursMax}
                  </span>
                </div>

                {/* Preset shortcuts */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400">{ui.sections.advance.presets}</span>
                  {ui.sections.advance.maxPresetsList.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      disabled={formDisabled}
                      onClick={() => updateField("maxAdvanceBookingHours", preset.value)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                        form.maxAdvanceBookingHours === preset.value
                          ? "bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f]"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted/80",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                  {formCopy.maxAdvanceBookingHoursHint}
                </p>
                {fieldErrors.maxAdvanceBookingHours ? (
                  <p className={adminErrorMessageClass}>
                    {fieldErrors.maxAdvanceBookingHours}
                  </p>
                ) : null}
              </div>
            </div>
          </SectionCard>

          {/* SECTION 2: Cancellation Policy & Grace Period */}
          <SectionCard
            icon={CalendarX}
            title={ui.sections.cancellation.title}
            description={ui.sections.cancellation.description}
          >
            <div className="space-y-5">
              {/* Free cancellation grace window */}
              <div className="space-y-2 max-w-md">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="booking-policy-free-cancel"
                    className={cn(
                      "text-xs font-semibold text-slate-700 dark:text-foreground",
                      fieldErrors.freeCancellationHours && adminLabelErrorClass,
                    )}
                  >
                    {formCopy.freeCancellationHours} <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-muted-foreground">
                    {ui.formatHours(form.freeCancellationHours)}
                  </span>
                </div>

                <div
                  className={cn(
                    "flex items-center overflow-hidden rounded-lg border shadow-sm transition-colors",
                    fieldErrors.freeCancellationHours
                      ? adminInputGroupErrorClass
                      : "border-slate-200 bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 dark:border-border dark:bg-muted/50",
                  )}
                >
                  <Input
                    id="booking-policy-free-cancel"
                    type="number"
                    min={0}
                    value={form.freeCancellationHours}
                    onChange={(event) =>
                      updateField("freeCancellationHours", event.target.value)
                    }
                    placeholder={formCopy.hoursPlaceholder}
                    disabled={formDisabled}
                    aria-invalid={Boolean(fieldErrors.freeCancellationHours)}
                    className={cn(
                      "h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium tabular-nums shadow-none focus-visible:ring-0",
                      fieldErrors.freeCancellationHours && "text-red-900 placeholder:text-red-400 dark:text-red-200",
                    )}
                  />
                  <span
                    className={cn(
                      "flex h-10 shrink-0 items-center border-l px-3 text-xs font-medium",
                      fieldErrors.freeCancellationHours
                        ? "border-red-200 bg-red-100/50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300"
                        : "border-slate-100 bg-slate-50/50 text-slate-500 dark:border-border dark:bg-muted/40 dark:text-muted-foreground",
                    )}
                  >
                    {ui.sections.cancellation.hoursPrior}
                  </span>
                </div>

                {/* Preset shortcuts */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400">{ui.sections.cancellation.presets}</span>
                  {ui.sections.cancellation.presetsList.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      disabled={formDisabled}
                      onClick={() => updateField("freeCancellationHours", preset.value)}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                        form.freeCancellationHours === preset.value
                          ? "bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f]"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-muted dark:text-muted-foreground dark:hover:bg-muted/80",
                      )}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                  {formCopy.freeCancellationHoursHint}
                </p>
                {fieldErrors.freeCancellationHours ? (
                  <p className={adminErrorMessageClass}>
                    {fieldErrors.freeCancellationHours}
                  </p>
                ) : null}
              </div>

              {/* Late Cancellation Penalty Selection */}
              <div className="space-y-3 pt-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-foreground">
                  {formCopy.lateCancellationType} <span className="text-red-500">*</span>
                </Label>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      type: "none" as const,
                      icon: Check,
                      title: copy.lateCancellationTypes.none,
                      desc: copy.lateCancellationTypeHelp.none,
                    },
                    {
                      type: "charge_fee" as const,
                      icon: Coins,
                      title: copy.lateCancellationTypes.charge_fee,
                      desc: copy.lateCancellationTypeHelp.charge_fee,
                    },
                    {
                      type: "bill_as_trip" as const,
                      icon: Receipt,
                      title: copy.lateCancellationTypes.bill_as_trip,
                      desc: copy.lateCancellationTypeHelp.bill_as_trip,
                    },
                  ].map((item) => {
                    const isSelected = form.lateCancellationType === item.type;
                    const ItemIcon = item.icon;

                    return (
                      <button
                        key={item.type}
                        type="button"
                        disabled={formDisabled}
                        onClick={() => updateField("lateCancellationType", item.type)}
                        className={cn(
                          "flex flex-col items-start rounded-xl border p-3.5 text-left transition-all",
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
                            <ItemIcon className="size-3.5" />
                          </div>

                          {isSelected ? (
                            <span className="flex size-4 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f]">
                              <Check className="size-2.5" />
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-2.5 text-xs font-bold text-slate-900 dark:text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-muted-foreground">
                          {item.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Inline Fee Input if charging a fee */}
                {showLateFeeField ? (
                  <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-border dark:bg-muted/30">
                    <div className="max-w-xs space-y-1.5">
                      <Label
                        htmlFor="booking-policy-late-fee"
                        className={cn(
                          "text-xs font-semibold text-slate-700 dark:text-foreground",
                          fieldErrors.lateCancellationFee && adminLabelErrorClass,
                        )}
                      >
                        {formCopy.lateCancellationFee} <span className="text-red-500">*</span>
                      </Label>

                      <div
                        className={cn(
                          "flex items-center overflow-hidden rounded-lg border shadow-sm transition-colors",
                          fieldErrors.lateCancellationFee
                            ? adminInputGroupErrorClass
                            : "border-slate-200 bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 dark:border-border dark:bg-muted/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 shrink-0 items-center border-r px-3.5 text-xs font-bold uppercase tracking-wider",
                            fieldErrors.lateCancellationFee
                              ? "border-red-200 bg-red-100/50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300"
                              : "border-slate-100 bg-slate-50/80 text-slate-600 dark:border-border dark:bg-muted/60 dark:text-muted-foreground",
                          )}
                        >
                          {form.currency}
                        </span>
                        <Input
                          id="booking-policy-late-fee"
                          type="number"
                          min={0}
                          step="0.01"
                          value={form.lateCancellationFee}
                          onChange={(event) =>
                            updateField("lateCancellationFee", event.target.value)
                          }
                          placeholder={formCopy.feePlaceholder}
                          disabled={formDisabled}
                          aria-invalid={Boolean(fieldErrors.lateCancellationFee)}
                          className={cn(
                            "h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium tabular-nums shadow-none focus-visible:ring-0",
                            fieldErrors.lateCancellationFee && "text-red-900 placeholder:text-red-400 dark:text-red-200",
                          )}
                        />
                      </div>

                      {fieldErrors.lateCancellationFee ? (
                        <p className={adminErrorMessageClass}>
                          {fieldErrors.lateCancellationFee}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                          {ui.sections.cancellation.lateFeeHelp(form.currency)}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </SectionCard>

          {/* SECTION 3: Passenger No-Show Policy */}
          <SectionCard
            icon={UserX}
            title={ui.sections.noShow.title}
            description={ui.sections.noShow.description}
          >
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-700 dark:text-foreground">
                {formCopy.noShowType} <span className="text-red-500">*</span>
              </Label>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    type: "none" as const,
                    icon: Check,
                    title: copy.noShowTypes.none,
                    desc: copy.noShowTypeHelp.none,
                  },
                  {
                    type: "charge_fee" as const,
                    icon: Coins,
                    title: copy.noShowTypes.charge_fee,
                    desc: copy.noShowTypeHelp.charge_fee,
                  },
                  {
                    type: "bill_as_trip" as const,
                    icon: Receipt,
                    title: copy.noShowTypes.bill_as_trip,
                    desc: copy.noShowTypeHelp.bill_as_trip,
                  },
                ].map((item) => {
                  const isSelected = form.noShowType === item.type;
                  const ItemIcon = item.icon;

                  return (
                    <button
                      key={item.type}
                      type="button"
                      disabled={formDisabled}
                      onClick={() => updateField("noShowType", item.type)}
                      className={cn(
                        "flex flex-col items-start rounded-xl border p-3.5 text-left transition-all",
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
                          <ItemIcon className="size-3.5" />
                        </div>

                        {isSelected ? (
                          <span className="flex size-4 items-center justify-center rounded-full bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f]">
                            <Check className="size-2.5" />
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2.5 text-xs font-bold text-slate-900 dark:text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-muted-foreground">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Inline Fee Input if charging no-show fee */}
              {showNoShowFeeField ? (
                <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 dark:border-border dark:bg-muted/30">
                  <div className="max-w-xs space-y-1.5">
                    <Label
                      htmlFor="booking-policy-no-show-fee"
                      className={cn(
                        "text-xs font-semibold text-slate-700 dark:text-foreground",
                        fieldErrors.noShowFee && adminLabelErrorClass,
                      )}
                    >
                      {formCopy.noShowFee} <span className="text-red-500">*</span>
                    </Label>

                    <div
                      className={cn(
                        "flex items-center overflow-hidden rounded-lg border shadow-sm transition-colors",
                        fieldErrors.noShowFee
                          ? adminInputGroupErrorClass
                          : "border-slate-200 bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 dark:border-border dark:bg-muted/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 shrink-0 items-center border-r px-3.5 text-xs font-bold uppercase tracking-wider",
                          fieldErrors.noShowFee
                            ? "border-red-200 bg-red-100/50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300"
                            : "border-slate-100 bg-slate-50/80 text-slate-600 dark:border-border dark:bg-muted/60 dark:text-muted-foreground",
                        )}
                      >
                        {form.currency}
                      </span>
                      <Input
                        id="booking-policy-no-show-fee"
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.noShowFee}
                        onChange={(event) => updateField("noShowFee", event.target.value)}
                        placeholder={formCopy.feePlaceholder}
                        disabled={formDisabled}
                        className={cn(
                          "h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium tabular-nums shadow-none focus-visible:ring-0",
                          fieldErrors.noShowFee && "text-red-900 placeholder:text-red-400 dark:text-red-200",
                        )}
                      />
                    </div>

                    {fieldErrors.noShowFee ? (
                      <p className="text-xs font-medium text-red-600 dark:text-red-400">
                        {fieldErrors.noShowFee}
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                        {ui.sections.noShow.noShowFeeHelp(form.currency)}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>

          {/* Sticky Bottom Action Bar */}
          {canWrite ? (
            <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/95 px-5 py-3.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85 dark:border-border dark:bg-card/95">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-muted-foreground">
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-muted dark:text-foreground">
                  {form.currency}
                </span>
                <span>·</span>
                <span className="font-semibold text-slate-700 dark:text-foreground">
                  {ui.footer.notice} {form.minAdvanceBookingHours}h – {form.maxAdvanceBookingHours}h
                </span>
                <span>·</span>
                <span>{ui.footer.freeCancel} &ge;{form.freeCancellationHours}h</span>
                {isFormDirty ? (
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {ui.footer.unsavedChanges}
                  </span>
                ) : null}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {isFormDirty ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving}
                    className="h-10 px-3.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-border dark:text-muted-foreground dark:hover:bg-muted"
                  >
                    <RotateCcw className="size-3.5 mr-1" />
                    {ui.footer.reset}
                  </Button>
                ) : null}

                <Button
                  type="submit"
                  disabled={saving || !isFormDirty}
                  className={cn(adminPrimaryButtonClass, "min-w-[140px] font-semibold")}
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      {isEdit ? formCopy.saving : formCopy.creating}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Save className="size-4" />
                      {isEdit ? formCopy.save : formCopy.create}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-4 dark:border-border dark:bg-muted/40">
              <p className="text-xs text-slate-500">{copy.readOnlyHint}</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
