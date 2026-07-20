"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CarFront,
  Clock3,
  FileText,
  Loader2,
  Save,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  updateDeadlineSettings,
} from "@/lib/system-settings-api";

type DeadlineFieldKey =
  | "ride_request_cancel_grace_minutes"
  | "ride_request_edit_grace_minutes"
  | "invoice_due_soon_days"
  | "insurance_due_soon_days"
  | "inspection_due_soon_days";

type DeadlineSectionId = "rideRequests" | "billing" | "compliance";

const DEFAULT_VALUES: Record<DeadlineFieldKey, string> = {
  ride_request_cancel_grace_minutes: "15",
  ride_request_edit_grace_minutes: "15",
  invoice_due_soon_days: "3",
  insurance_due_soon_days: "30",
  inspection_due_soon_days: "30",
};

const FIELDS: Array<{
  key: DeadlineFieldKey;
  section: DeadlineSectionId;
  unit: "minutes" | "days";
  min: number;
  max: number;
  placeholder: string;
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
  { id: "billing", icon: FileText },
  { id: "compliance", icon: ShieldCheck },
];

function formatPreview(
  value: string,
  unit: "minutes" | "days",
  copy: ReturnType<typeof getAdminDeadlineSettingsMessages>,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return copy.previews.empty;
  return formatMessage(copy.previews[unit], { value: parsed });
}

function DeadlineSettingsSkeleton() {
  return (
    <div className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
      <div className="space-y-6 p-5 sm:p-6">
        {[0, 1, 2].map((section) => (
          <div key={section} className="space-y-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-64" />
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <Skeleton className="h-16 w-full rounded-lg" />
              {section !== 1 ? <Skeleton className="h-16 w-full rounded-lg" /> : null}
            </div>
          </div>
        ))}
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canRead) return;

    let active = true;
    setLoading(true);

    void fetchDeadlineSettings()
      .then((result) => {
        if (!active) return;
        setValues({
          ride_request_cancel_grace_minutes: String(result.ride_request_cancel_grace_minutes),
          ride_request_edit_grace_minutes: String(result.ride_request_edit_grace_minutes),
          invoice_due_soon_days: String(result.invoice_due_soon_days),
          insurance_due_soon_days: String(result.insurance_due_soon_days),
          inspection_due_soon_days: String(result.inspection_due_soon_days),
        });
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

  async function handleSave() {
    if (!canWrite) return;

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

    setSaving(true);

    try {
      const saved = await updateDeadlineSettings({
        ride_request_cancel_grace_minutes: Math.trunc(
          Number(values.ride_request_cancel_grace_minutes),
        ),
        ride_request_edit_grace_minutes: Math.trunc(
          Number(values.ride_request_edit_grace_minutes),
        ),
        invoice_due_soon_days: Math.trunc(Number(values.invoice_due_soon_days)),
        insurance_due_soon_days: Math.trunc(Number(values.insurance_due_soon_days)),
        inspection_due_soon_days: Math.trunc(Number(values.inspection_due_soon_days)),
      });

      setValues({
        ride_request_cancel_grace_minutes: String(saved.ride_request_cancel_grace_minutes),
        ride_request_edit_grace_minutes: String(saved.ride_request_edit_grace_minutes),
        invoice_due_soon_days: String(saved.invoice_due_soon_days),
        insurance_due_soon_days: String(saved.insurance_due_soon_days),
        inspection_due_soon_days: String(saved.inspection_due_soon_days),
      });

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

  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0 space-y-3">
        <Badge className={adminBadgeGoldClass}>{copy.eyebrow}</Badge>
        <div className="flex items-start gap-3">
          <div className={adminIconBoxClass}>
            <Clock3 className="size-5" />
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
        <DeadlineSettingsSkeleton />
      ) : (
        <div className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
          <div className="divide-y divide-slate-100">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const sectionCopy = copy.sections[section.id];
              const sectionFields = FIELDS.filter((field) => field.section === section.id);

              return (
                <section key={section.id} className="px-5 py-5 sm:px-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-[#1C3A34]/6 p-2 text-[#1C3A34]">
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className={cn("text-base font-bold", adminHeadingClass)}>
                        {sectionCopy.title}
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-500">{sectionCopy.description}</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {sectionFields.map((field) => {
                      const fieldCopy = copy.modules[field.key];
                      const unitLabel = copy.units[field.unit];

                      return (
                        <div
                          key={field.key}
                          className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-[#f8fafb]/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className="text-sm font-semibold text-[#1C3A34]">
                                {fieldCopy.label}
                              </p>
                              <span className="text-xs text-slate-400">·</span>
                              <p className="text-xs font-medium text-slate-500">
                                {previews[field.key]}
                              </p>
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                              {fieldCopy.helper}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {formatMessage(copy.configure.rangeInfo, {
                                min: field.min,
                                max: field.max,
                                suffix: unitLabel,
                              })}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2 sm:w-[11.5rem]">
                            <Input
                              id={field.key}
                              type="number"
                              min={field.min}
                              max={field.max}
                              value={values[field.key]}
                              onChange={(event) =>
                                setValues((current) => ({
                                  ...current,
                                  [field.key]: event.target.value,
                                }))
                              }
                              disabled={saving || !canWrite}
                              placeholder={field.placeholder}
                              className={cn(adminInputClass, "w-full tabular-nums")}
                              aria-label={fieldCopy.label}
                            />
                            <span className="w-14 shrink-0 text-xs font-medium text-slate-500">
                              {unitLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {canWrite ? (
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200/80 bg-white/95 px-5 py-3.5 backdrop-blur supports-[backdrop-filter]:bg-white/85 sm:px-6">
              <p className="hidden text-xs text-slate-500 sm:block">{copy.configure.description}</p>
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className={cn(adminPrimaryButtonClass, "ml-auto")}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                {saving ? copy.configure.savingButton : copy.configure.saveButton}
              </Button>
            </div>
          ) : (
            <div className="border-t border-slate-200/80 px-5 py-3.5 sm:px-6">
              <p className="text-sm text-slate-500">{copy.configure.readOnlyHint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
