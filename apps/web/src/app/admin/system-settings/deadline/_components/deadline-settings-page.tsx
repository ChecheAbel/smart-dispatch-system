"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BellRing,
  CarFront,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Megaphone,
  RotateCcw,
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

const PRESETS: Partial<Record<DeadlineFieldKey, number[]>> = {
  ride_request_cancel_grace_minutes: [5, 15, 30, 60],
  ride_request_edit_grace_minutes: [5, 15, 30, 60],
  ride_request_reminder_hours: [1, 2, 4, 12, 24],
  dispatch_escalate_dispatcher_minutes: [5, 10, 15, 30],
  dispatch_escalate_supervisor_minutes: [15, 30, 45, 60],
  invoice_due_soon_days: [3, 7, 14, 30],
  insurance_due_soon_days: [15, 30, 60, 90],
  inspection_due_soon_days: [15, 30, 60, 90],
};

function SectionHeader({
  icon: Icon,
  title,
  description,
  count,
}: {
  icon: typeof Clock3;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className={adminIconBoxClass}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className={cn("text-base font-bold", adminHeadingClass)}>{title}</h2>
            {count !== undefined ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-muted dark:text-muted-foreground">
                {count} {count === 1 ? "rule" : "rules"}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
            {description}
          </p>
        </div>
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
  const presets = PRESETS[field.key];

  const numVal = Number(value);
  const isInvalid = value !== "" && (!Number.isFinite(numVal) || numVal < field.min || numVal > field.max);

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors sm:px-5 sm:py-4",
        emphasized
          ? "border-[color-mix(in_srgb,var(--brand-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--brand-accent)_8%,white)] dark:border-[var(--brand-accent)]/35 dark:bg-[var(--brand-accent)]/10"
          : "border-slate-200/70 bg-slate-50/50 hover:border-slate-300/80 dark:border-border dark:bg-muted/20",
        isInvalid && "border-rose-300 bg-rose-50/20 dark:border-rose-900/50 dark:bg-rose-950/20",
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
            {fieldCopy.helper}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-muted-foreground/80">
            {formatMessage(copy.configure.rangeInfo, {
              min: field.min,
              max: field.max,
              suffix: unitLabel,
            })}
          </p>

          {presets && presets.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-medium text-slate-400 dark:text-muted-foreground">
                Presets:
              </span>
              {presets.map((preset) => {
                const isSelected = value === String(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(String(preset))}
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors",
                      isSelected
                        ? "bg-[#1C3A34] text-white dark:bg-[var(--brand-accent)] dark:text-black shadow-xs"
                        : "border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-border dark:bg-muted/60 dark:text-slate-300 dark:hover:bg-accent",
                    )}
                  >
                    {preset} {field.unit === "minutes" ? "min" : field.unit === "hours" ? "hr" : "d"}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col gap-1 sm:w-[10.5rem]">
          <div className="relative flex items-center">
            <Input
              id={field.key}
              type="number"
              min={field.min}
              max={field.max}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              disabled={disabled}
              placeholder={field.placeholder}
              className={cn(
                adminInputClass,
                "w-full pr-14 tabular-nums font-semibold",
                isInvalid && "border-rose-400 focus-visible:ring-rose-400/30 dark:border-rose-500",
              )}
              aria-label={fieldCopy.label}
            />
            <span className="pointer-events-none absolute right-3 text-xs font-semibold text-slate-400 select-none dark:text-muted-foreground">
              {unitLabel}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            {isInvalid ? (
              <span className="font-medium text-rose-500 dark:text-rose-400">
                Range: {field.min}–{field.max}
              </span>
            ) : (
              <span />
            )}
            <span className="font-medium text-slate-400 dark:text-muted-foreground/80">
              {preview}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeadlineSettingsSkeleton() {
  return (
    <div className={cn(adminCardClass, "overflow-hidden rounded-2xl border shadow-xs")}>
      <div className="divide-y divide-slate-100 dark:divide-border">
        {[0, 1, 2, 3].map((section) => (
          <div key={section} className="space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Skeleton className="size-9 rounded-xl" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3.5 w-64" />
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-4 sm:px-6 dark:border-border dark:bg-muted/20">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
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

  function handleDiscard() {
    setValues(savedValues);
    setVat(savedVat);
  }

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
    <div className="min-w-0 space-y-6 pb-6">
      {loading ? (
        <DeadlineSettingsSkeleton />
      ) : (
        <div className={cn(adminCardClass, "overflow-hidden rounded-2xl border shadow-xs")}>
          <div className="divide-y divide-slate-100 dark:divide-border">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const sectionCopy = copy.sections[section.id];
              const sectionFields = FIELDS.filter((field) => field.section === section.id);
              const standardFields = sectionFields.filter((field) => !field.emphasized);
              const emphasizedFields = sectionFields.filter((field) => field.emphasized);

              return (
                <section key={section.id} className="p-5 sm:p-6">
                  <SectionHeader
                    icon={Icon}
                    title={sectionCopy.title}
                    description={sectionCopy.description}
                    count={section.id === "billing" ? sectionFields.length + 1 : sectionFields.length}
                  />

                  {section.id === "dispatch" &&
                  Number(values.dispatch_escalate_supervisor_minutes) <
                    Number(values.dispatch_escalate_dispatcher_minutes) ? (
                    <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                      <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        Supervisor escalation delay should be greater than or equal to dispatcher escalation delay.
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-5 space-y-3.5">
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
                      <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 transition-colors sm:px-5 sm:py-4 dark:border-border dark:bg-muted/20">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor="invoice-vat-enabled"
                                className="text-sm font-semibold text-[var(--brand-primary)] dark:text-foreground cursor-pointer"
                              >
                                {copy.modules.vat.label}
                              </label>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  vat.enabled
                                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                                )}
                              >
                                {vat.enabled ? copy.modules.vat.enabledOn : copy.modules.vat.enabledOff}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-muted-foreground">
                              {copy.modules.vat.helper}
                            </p>
                            <p className="mt-1.5 text-[11px] text-slate-400 dark:text-muted-foreground/80">
                              {vat.enabled
                                ? formatMessage(copy.modules.vat.preview, { rate: vat.rate_percent })
                                : copy.modules.vat.previewOff}
                            </p>
                          </div>

                          <div className="flex flex-col items-end gap-2.5 sm:w-[10.5rem]">
                            <Switch
                              id="invoice-vat-enabled"
                              checked={vat.enabled}
                              disabled={formDisabled}
                              onCheckedChange={(checked) =>
                                setVat((current) => ({ ...current, enabled: checked }))
                              }
                            />
                            {vat.enabled ? (
                              <div className="relative flex w-full items-center">
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
                                  className={cn(
                                    adminInputClass,
                                    "w-full pr-8 tabular-nums font-semibold",
                                    (Number(vat.rate_percent) < 0 || Number(vat.rate_percent) > 100) &&
                                      "border-rose-400 focus-visible:ring-rose-400/30 dark:border-rose-500",
                                  )}
                                  aria-label={copy.modules.vat.rateLabel}
                                />
                                <span className="pointer-events-none absolute right-3 text-xs font-semibold text-slate-400 select-none dark:text-muted-foreground">
                                  %
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Integrated Settings Card Footer: Save Changes Bar */}
          <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 p-4 dark:border-border dark:bg-muted/20 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
            <div className="flex items-center gap-2.5 min-w-0">
              {saving ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-[#1C3A34] dark:text-[var(--brand-accent)]" />
              ) : isDirty ? (
                <span className="relative flex size-2.5 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                </span>
              ) : (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">
                  {saving
                    ? "Saving deadline settings…"
                    : isDirty
                      ? copy.configure.unsavedChanges ?? "You have unsaved changes"
                      : copy.configure.allSaved ?? "All changes saved"}
                </p>
                <p className="hidden truncate text-[11px] text-slate-500 dark:text-muted-foreground sm:block">
                  {copy.configure.description}
                </p>
              </div>
            </div>

            {canWrite ? (
              <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                {isDirty ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDiscard}
                    disabled={saving}
                    className="h-9 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 dark:text-slate-300 dark:hover:bg-accent"
                  >
                    <RotateCcw className="size-3.5" />
                    {copy.configure.discardButton ?? "Discard"}
                  </Button>
                ) : null}

                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || !isDirty}
                  className={cn(adminPrimaryButtonClass, "h-9 rounded-xl px-4 text-xs font-semibold shadow-xs")}
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  {saving ? copy.configure.savingButton : copy.configure.saveButton}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                {copy.configure.readOnlyHint}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
