"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ClipboardList, Loader2, Save } from "lucide-react";
import type { LateCancellationType } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Button } from "@/components/ui/button";
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
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
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
  freeCancellationHours: string;
  lateCancellationType: LateCancellationType;
  lateCancellationFee: string;
  currency: string;
};

type FieldErrors = Partial<Record<keyof BookingPolicyFormState, string>>;

const emptyForm: BookingPolicyFormState = {
  minAdvanceBookingHours: "24",
  freeCancellationHours: "24",
  lateCancellationType: "none",
  lateCancellationFee: "",
  currency: "ETB",
};

const fieldClassName = adminInputClass;
const fieldErrorClassName =
  "border-red-300 bg-red-50/60 text-red-900 placeholder:text-red-400 focus-visible:border-red-400 focus-visible:ring-red-200/60";

function BookingPolicyFormSkeleton() {
  return (
    <div className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
      <div className="space-y-6 p-5 sm:p-6">
        <div className="space-y-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
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

  const [policyId, setPolicyId] = useState<string | null>(null);
  const [form, setForm] = useState<BookingPolicyFormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(policyId);
  const showFeeField = form.lateCancellationType === "charge_fee";
  const formDisabled = saving || loading || !canWrite;

  const lateCancellationItems = LATE_CANCELLATION_TYPES.map((type) => ({
    value: type,
    label: copy.lateCancellationTypes[type],
  }));

  const currencyItems = CURRENCY_CODES.map((code) => ({
    value: code,
    label: code,
  }));

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
          }
          return;
        }

        const policy = await fetchBookingPolicyById(existing.id, locale);
        if (!cancelled) {
          setPolicyId(policy.id);
          setForm({
            minAdvanceBookingHours: String(policy.min_advance_booking_hours),
            freeCancellationHours: String(policy.free_cancellation_hours),
            lateCancellationType: policy.late_cancellation_type,
            lateCancellationFee:
              policy.late_cancellation_fee != null
                ? String(policy.late_cancellation_fee)
                : "",
            currency: policy.currency,
          });
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

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    const payload = {
      translations: DEFAULT_POLICY_TRANSLATIONS,
      min_advance_booking_hours: Number(minAdvance),
      free_cancellation_hours: Number(freeCancel),
      late_cancellation_type: form.lateCancellationType,
      late_cancellation_fee:
        form.lateCancellationType === "charge_fee"
          ? Number(form.lateCancellationFee.trim())
          : null,
      currency: form.currency,
      is_active: true,
    };

    setSaving(true);

    try {
      const policy = policyId
        ? await updateBookingPolicy(policyId, payload)
        : await createBookingPolicy(payload);

      setPolicyId(policy.id);
      setForm({
        minAdvanceBookingHours: String(policy.min_advance_booking_hours),
        freeCancellationHours: String(policy.free_cancellation_hours),
        lateCancellationType: policy.late_cancellation_type,
        lateCancellationFee:
          policy.late_cancellation_fee != null ? String(policy.late_cancellation_fee) : "",
        currency: policy.currency,
      });

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
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          <div className={adminIconBoxClass}>
            <ClipboardList className="size-5" />
          </div>
          <div className="min-w-0">
            <h1 className={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}>
              {copy.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              {copy.description}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <BookingPolicyFormSkeleton />
      ) : (
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className={cn(adminCardClass, "overflow-hidden rounded-xl")}
        >
          <div className="space-y-6 p-5 sm:p-6">
            <div className="space-y-4">
              <p className={cn("text-sm font-semibold", adminHeadingClass)}>{formCopy.rulesTitle}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="booking-policy-min-advance"
                    className={fieldErrors.minAdvanceBookingHours ? "text-red-700" : undefined}
                  >
                    {formCopy.minAdvanceBookingHours}
                  </Label>
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
                    className={cn(
                      fieldClassName,
                      fieldErrors.minAdvanceBookingHours && fieldErrorClassName,
                    )}
                  />
                  <p className="text-xs text-slate-500">{formCopy.minAdvanceBookingHoursHint}</p>
                  {fieldErrors.minAdvanceBookingHours ? (
                    <p className="text-xs text-red-600">{fieldErrors.minAdvanceBookingHours}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="booking-policy-free-cancel"
                    className={fieldErrors.freeCancellationHours ? "text-red-700" : undefined}
                  >
                    {formCopy.freeCancellationHours}
                  </Label>
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
                    className={cn(
                      fieldClassName,
                      fieldErrors.freeCancellationHours && fieldErrorClassName,
                    )}
                  />
                  <p className="text-xs text-slate-500">{formCopy.freeCancellationHoursHint}</p>
                  {fieldErrors.freeCancellationHours ? (
                    <p className="text-xs text-red-600">{fieldErrors.freeCancellationHours}</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-policy-late-type">{formCopy.lateCancellationType}</Label>
                <Select
                  items={lateCancellationItems}
                  value={form.lateCancellationType}
                  onValueChange={(value) =>
                    updateField("lateCancellationType", (value ?? "none") as LateCancellationType)
                  }
                  disabled={formDisabled}
                >
                  <SelectTrigger
                    id="booking-policy-late-type"
                    className={cn(fieldClassName, "w-full")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} align="start" className="w-(--anchor-width)">
                    <SelectGroup>
                      {lateCancellationItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  {copy.lateCancellationTypeHelp[form.lateCancellationType]}
                </p>
              </div>

              {showFeeField ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label
                      htmlFor="booking-policy-late-fee"
                      className={fieldErrors.lateCancellationFee ? "text-red-700" : undefined}
                    >
                      {formCopy.lateCancellationFee}
                    </Label>
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
                      className={cn(
                        fieldClassName,
                        fieldErrors.lateCancellationFee && fieldErrorClassName,
                      )}
                    />
                    {fieldErrors.lateCancellationFee ? (
                      <p className="text-xs text-red-600">{fieldErrors.lateCancellationFee}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="booking-policy-currency">{formCopy.currency}</Label>
                    <Select
                      items={currencyItems}
                      value={form.currency}
                      onValueChange={(value) => updateField("currency", value ?? "ETB")}
                      disabled={formDisabled}
                    >
                      <SelectTrigger
                        id="booking-policy-currency"
                        className={cn(fieldClassName, "w-full")}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} align="start" className="w-(--anchor-width)">
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
              ) : null}
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </div>

          {canWrite ? (
            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-200/80 bg-white/95 px-5 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6">
              <Button type="submit" disabled={saving} className={adminPrimaryButtonClass}>
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving
                  ? isEdit
                    ? formCopy.saving
                    : formCopy.creating
                  : isEdit
                    ? formCopy.save
                    : formCopy.create}
              </Button>
            </div>
          ) : (
            <div className="border-t border-slate-200/80 px-5 py-3.5 sm:px-6">
              <p className="text-sm text-slate-500">{copy.readOnlyHint}</p>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
