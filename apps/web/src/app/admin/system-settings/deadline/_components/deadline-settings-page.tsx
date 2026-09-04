"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  CarFront,
  Clock3,
  FileText,
  Loader2,
  Megaphone,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { getAdminDeadlineSettingsMessages, formatMessage } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { PERMISSIONS } from "@/lib/permissions";
import {
  adminBadgeGoldClass,
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminInputClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  fetchDeadlineSettings,
  fetchVatSettings,
  updateDeadlineSettings,
  updateVatSettings,
  type DeadlineSettings,
  type VatSettings,
} from "@/lib/system-settings-api";

type DeadlineFieldKey =
  | "ride_request_cancel_grace_minutes"
  | "ride_request_edit_grace_minutes"
  | "ride_request_reminder_hours"
  | "dispatch_escalate_dispatcher_minutes"
  | "dispatch_escalate_supervisor_minutes"
  | "invoice_due_soon_days"
  | "insurance_due_soon_days"
  | "inspection_due_soon_days";

type DeadlineSectionId = "rideRequests" | "dispatch" | "billing" | "compliance";

type DeadlineUnit = "minutes" | "hours" | "days";

type DeadlineCopy = ReturnType<typeof getAdminDeadlineSettingsMessages>;

const DEFAULT_VALUES: Record<DeadlineFieldKey, string> = {
  ride_request_cancel_grace_minutes: "15",
  ride_request_edit_grace_minutes: "15",
  ride_request_reminder_hours: "2",
  dispatch_escalate_dispatcher_minutes: "15",
  dispatch_escalate_supervisor_minutes: "30",
  invoice_due_soon_days: "3",
  insurance_due_soon_days: "30",
  inspection_due_soon_days: "30",
};

const FIELDS: Array<{
  key: DeadlineFieldKey;
  section: DeadlineSectionId;
  unit: DeadlineUnit;
  min: number;
  max: number;
  placeholder: string;
  emphasized?: boolean;
}> = [
  {
    key: "ride_request_cancel_grace_minutes",
    section: "rideRequests",
    unit: "minutes",
    min: 1,
    max: 1440,
    placeholder: "15",
  },
  {
    key: "ride_request_edit_grace_minutes",
    section: "rideRequests",
    unit: "minutes",
    min: 1,
    max: 1440,
    placeholder: "15",
  },
  {
    key: "ride_request_reminder_hours",
    section: "rideRequests",
    unit: "hours",
    min: 1,
    max: 168,
    placeholder: "2",
    emphasized: true,
  },
  {
    key: "dispatch_escalate_dispatcher_minutes",
    section: "dispatch",
    unit: "minutes",
    min: 1,
    max: 1440,
    placeholder: "15",
    emphasized: true,
  },
  {
    key: "dispatch_escalate_supervisor_minutes",
    section: "dispatch",
    unit: "minutes",
    min: 1,
    max: 1440,
    placeholder: "30",
    emphasized: true,
  },
  {
    key: "invoice_due_soon_days",
    section: "billing",
    unit: "days",
    min: 1,
    max: 365,
    placeholder: "3",
  },
  {
    key: "insurance_due_soon_days",
    section: "compliance",
    unit: "days",
    min: 1,
    max: 3650,
    placeholder: "30",
  },
  {
    key: "inspection_due_soon_days",
    section: "compliance",
    unit: "days",
    min: 1,
    max: 3650,
    placeholder: "30",
  },
];

const SECTIONS: Array<{
  id: DeadlineSectionId;
  icon: typeof Clock3;
}> = [
  { id: "rideRequests", icon: CarFront },
  { id: "dispatch", icon: Megaphone },
  { id: "billing", icon: FileText },
  { id: "compliance", icon: ShieldCheck },
];

function settingsToForm(settings: DeadlineSettings): Record<DeadlineFieldKey, string> {
  return {
    ride_request_cancel_grace_minutes: String(settings.ride_request_cancel_grace_minutes),
    ride_request_edit_grace_minutes: String(settings.ride_request_edit_grace_minutes),
    ride_request_reminder_hours: String(settings.ride_request_reminder_hours),
    dispatch_escalate_dispatcher_minutes: String(
      settings.dispatch_escalate_dispatcher_minutes ?? 15,
    ),
    dispatch_escalate_supervisor_minutes: String(
      settings.dispatch_escalate_supervisor_minutes ?? 30,
    ),
    invoice_due_soon_days: String(settings.invoice_due_soon_days),
    insurance_due_soon_days: String(settings.insurance_due_soon_days),
    inspection_due_soon_days: String(settings.inspection_due_soon_days),
  };
}

function formatPreview(value: string, unit: DeadlineUnit, copy: DeadlineCopy) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return copy.previews.empty;
  return formatMessage(copy.previews[unit], { value: parsed });
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Clock3;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={adminIconBoxClass}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <h2 className={cn("text-base font-bold", adminHeadingClass)}>{title}</h2>
        <p className="mt-0.5 text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

const DEFAULT_VAT: VatSettings = {
  enabled: false,
  rate_percent: 15,
};

function DeadlineFieldRow({
  field,
  value,
  preview,
  copy,
  disabled,
  onChange,
}: {
  field: (typeof FIELDS)[number];
  value: string;
  preview: string;
  copy: DeadlineCopy;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const fieldCopy = copy.modules[field.key];
  const unitLabel = copy.units[field.unit];
  const emphasized = Boolean(field.emphasized);

  return (
    <div
      className={cn(
        "rounded-xl px-4 py-4 sm:px-5",
        emphasized
          ? "border border-[color-mix(in_srgb,var(--brand-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--brand-accent)_8%,white)] dark:border-[var(--brand-accent)]/35 dark:bg-[var(--brand-accent)]/10"
          : "bg-[#f8fafb]/80 dark:bg-muted/40",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {emphasized ? (
              <span
                className={cn(
                  adminBadgeGoldClass,
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]",
                )}
              >
                <BellRing className="size-3" />
                {copy.badges.notification}
              </span>
            ) : null}
            <label
              htmlFor={field.key}
              className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground"
            >
              {fieldCopy.label}
            </label>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
            {fieldCopy.helper}
          </p>
          <p className="mt-2 text-xs text-slate-400 dark:text-muted-foreground/80">
            {formatMessage(copy.configure.rangeInfo, {
              min: field.min,
              max: field.max,
              suffix: unitLabel,
            })}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 sm:w-[10.5rem]">
          <div className="flex items-center gap-2">
            <Input
              id={field.key}
              type="number"
              min={field.min}
              max={field.max}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
              placeholder={field.placeholder}
              className={cn(adminInputClass, "w-full tabular-nums")}
              aria-label={fieldCopy.label}
            />
            <span className="w-10 shrink-0 text-xs font-medium text-slate-500 dark:text-muted-foreground">
              {unitLabel}
            </span>
          </div>
          <p className="text-right text-[11px] font-medium text-slate-400 dark:text-muted-foreground/80 sm:pr-12">
            {preview}
          </p>
        </div>
      </div>
    </div>
  );
}

function DeadlineSettingsSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((section) => (
        <div key={section} className={cn(adminCardClass, "overflow-hidden rounded-xl p-5 sm:p-6")}>
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            {section === 0 ? <Skeleton className="h-28 w-full rounded-xl sm:col-span-2" /> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DeadlineSettingsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminDeadlineSettingsMessages(locale);
  const canRead = hasPermission(PERMISSIONS.system_settings.read);
  const canWrite = hasPermission(PERMISSIONS.system_settings.write);

  const [values, setValues] = useState(DEFAULT_VALUES);
  const [savedValues, setSavedValues] = useState(DEFAULT_VALUES);
  const [vat, setVat] = useState<VatSettings>(DEFAULT_VAT);
  const [savedVat, setSavedVat] = useState<VatSettings>(DEFAULT_VAT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canRead) return;

    let active = true;
    setLoading(true);

    void Promise.all([fetchDeadlineSettings(), fetchVatSettings()])
      .then(([result, vatResult]) => {
        if (!active) return;
        const next = settingsToForm(result);
        setValues(next);
        setSavedValues(next);
        setVat(vatResult);
        setSavedVat(vatResult);
      })
      .catch(() => {
        if (!active) return;
        showErrorToast({
          title: copy.toast.loadFailed.title,
          description: copy.toast.loadFailed.description,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [canRead, copy.toast.loadFailed.description, copy.toast.loadFailed.title]);

  const previews = useMemo(
    () =>
      Object.fromEntries(
        FIELDS.map((field) => [
          field.key,
          formatPreview(values[field.key], field.unit, copy),
        ]),
      ) as Record<DeadlineFieldKey, string>,
    [values, copy],
  );

  const isDirty = useMemo(
    () =>
      FIELDS.some((field) => values[field.key] !== savedValues[field.key]) ||
      vat.enabled !== savedVat.enabled ||
      vat.rate_percent !== savedVat.rate_percent,
    [values, savedValues, vat, savedVat],
  );

  async function handleSave() {
    if (!canWrite || !isDirty) return;

    const invalid = FIELDS.find(({ key, min, max }) => {
      const value = Number(values[key]);
      return !Number.isFinite(value) || value < min || value > max;
    });

    if (invalid) {
      showErrorToast({
        title: copy.toast.invalidValues.title,
        description: copy.toast.invalidValues.description,
      });
      return;
    }

    if (
      Number(values.dispatch_escalate_supervisor_minutes) <
      Number(values.dispatch_escalate_dispatcher_minutes)
    ) {
      showErrorToast({
        title: copy.toast.invalidValues.title,
        description: copy.toast.invalidValues.description,
      });
      return;
    }

    const vatRate = Number(vat.rate_percent);
    if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
      showErrorToast({
        title: copy.toast.invalidValues.title,
        description: copy.toast.invalidValues.description,
      });
      return;
    }

    setSaving(true);

    try {
      const [saved, savedVatResult] = await Promise.all([
        updateDeadlineSettings({
          ride_request_cancel_grace_minutes: Math.trunc(
            Number(values.ride_request_cancel_grace_minutes),
          ),
          ride_request_edit_grace_minutes: Math.trunc(
            Number(values.ride_request_edit_grace_minutes),
          ),
          ride_request_reminder_hours: Math.trunc(Number(values.ride_request_reminder_hours)),
          dispatch_escalate_dispatcher_minutes: Math.trunc(
            Number(values.dispatch_escalate_dispatcher_minutes),
          ),
          dispatch_escalate_supervisor_minutes: Math.trunc(
            Number(values.dispatch_escalate_supervisor_minutes),
          ),
          invoice_due_soon_days: Math.trunc(Number(values.invoice_due_soon_days)),
          insurance_due_soon_days: Math.trunc(Number(values.insurance_due_soon_days)),
          inspection_due_soon_days: Math.trunc(Number(values.inspection_due_soon_days)),
        }),
        updateVatSettings({
          enabled: vat.enabled,
          rate_percent: Math.round(vatRate * 100) / 100,
        }),
      ]);

      const next = settingsToForm(saved);
      setValues(next);
      setSavedValues(next);
      setVat(savedVatResult);
      setSavedVat(savedVatResult);

      showSuccessToast({
        title: copy.toast.updateSuccess.title,
        description: copy.toast.updateSuccess.description,
      });
    } catch {
      showErrorToast({
        title: copy.toast.updateFailed.title,
        description: copy.toast.updateFailed.description,
      });
    } finally {
      setSaving(false);
    }
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  const formDisabled = saving || !canWrite;

  return (
    <div className="min-w-0 space-y-6 pb-24">
      {loading ? (
        <DeadlineSettingsSkeleton />
      ) : (
        <div className="space-y-5">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const sectionCopy = copy.sections[section.id];
            const sectionFields = FIELDS.filter((field) => field.section === section.id);
            const standardFields = sectionFields.filter((field) => !field.emphasized);
            const emphasizedFields = sectionFields.filter((field) => field.emphasized);

            return (
              <section
                key={section.id}
                className={cn(adminCardClass, "overflow-hidden rounded-xl")}
              >
                <div className="border-b border-slate-100 px-5 py-5 dark:border-border sm:px-6">
                  <SectionHeader
                    icon={Icon}
                    title={sectionCopy.title}
                    description={sectionCopy.description}
                  />
                </div>

                <div className="space-y-3 p-4 sm:p-5">
                  <div
                    className={cn(
                      "grid gap-3",
                      standardFields.length > 1 ? "sm:grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    {standardFields.map((field) => (
                      <DeadlineFieldRow
                        key={field.key}
                        field={field}
                        value={values[field.key]}
                        preview={previews[field.key]}
                        copy={copy}
                        disabled={formDisabled}
                        onChange={(next) =>
                          setValues((current) => ({ ...current, [field.key]: next }))
                        }
                      />
                    ))}
                  </div>

                  {emphasizedFields.map((field) => (
                    <DeadlineFieldRow
                      key={field.key}
                      field={field}
                      value={values[field.key]}
                      preview={previews[field.key]}
                      copy={copy}
                      disabled={formDisabled}
                      onChange={(next) =>
                        setValues((current) => ({ ...current, [field.key]: next }))
                      }
                    />
                  ))}

                  {section.id === "billing" ? (
                    <div className="rounded-xl bg-[#f8fafb]/80 px-4 py-4 sm:px-5 dark:bg-muted/40">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <label
                            htmlFor="invoice-vat-enabled"
                            className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground"
                          >
                            {copy.modules.vat.label}
                          </label>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
                            {copy.modules.vat.helper}
                          </p>
                          <p className="mt-2 text-xs text-slate-400 dark:text-muted-foreground/80">
                            {vat.enabled
                              ? formatMessage(copy.modules.vat.preview, { rate: vat.rate_percent })
                              : copy.modules.vat.previewOff}
                          </p>
                        </div>
                        <Switch
                          id="invoice-vat-enabled"
                          checked={vat.enabled}
                          disabled={formDisabled}
                          onCheckedChange={(checked) =>
                            setVat((current) => ({ ...current, enabled: checked }))
                          }
                        />
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-muted-foreground">
                        {vat.enabled ? copy.modules.vat.enabledOn : copy.modules.vat.enabledOff}
                      </p>
                      <div className="mt-4 flex items-center gap-2 sm:w-[10.5rem] sm:ml-auto">
                        <Input
                          id="invoice-vat-rate"
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          value={String(vat.rate_percent)}
                          onChange={(event) =>
                            setVat((current) => ({
                              ...current,
                              rate_percent: Number(event.target.value),
                            }))
                          }
                          disabled={formDisabled || !vat.enabled}
                          className={cn(adminInputClass, "w-full tabular-nums")}
                          aria-label={copy.modules.vat.rateLabel}
                        />
                        <span className="w-10 shrink-0 text-xs font-medium text-slate-500 dark:text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!loading && canWrite ? (
        <div className="sticky bottom-4 z-10">
          <div
            className={cn(
              adminCardClass,
              "flex items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-md sm:px-5",
              isDirty
                ? "border-[color-mix(in_srgb,var(--brand-accent)_40%,transparent)] dark:border-[var(--brand-accent)]/40"
                : "border-slate-200/80 dark:border-border",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--brand-primary)] dark:text-foreground">
                {isDirty ? copy.configure.unsavedChanges : copy.configure.allSaved}
              </p>
              <p className="mt-0.5 hidden text-xs text-slate-500 dark:text-muted-foreground sm:block">
                {copy.configure.description}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !isDirty}
              className={cn(adminPrimaryButtonClass, "shrink-0")}
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saving ? copy.configure.savingButton : copy.configure.saveButton}
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && !canWrite ? (
        <div className={cn(adminCardClass, "rounded-xl px-5 py-3.5")}>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            {copy.configure.readOnlyHint}
          </p>
        </div>
      ) : null}
    </div>
  );
}
