"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  FileText,
  ShieldCheck,
  Loader2,
  Save,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const DEFAULT_VALUES = {
  ride_request_cancel_grace_minutes: "15",
  ride_request_edit_grace_minutes: "15",
  invoice_due_soon_days: "3",
  insurance_due_soon_days: "30",
  inspection_due_soon_days: "30",
};

const MODULES: Array<{
  key: DeadlineFieldKey;
  icon: typeof Clock3;
  suffixKey: "minutes" | "days";
  min: number;
  max: number;
  placeholder: string;
}> = [
  {
    key: "ride_request_cancel_grace_minutes",
    icon: Clock3,
    suffixKey: "minutes",
    min: 1,
    max: 1440,
    placeholder: "15",
  },
  {
    key: "ride_request_edit_grace_minutes",
    icon: Clock3,
    suffixKey: "minutes",
    min: 1,
    max: 1440,
    placeholder: "15",
  },
  {
    key: "invoice_due_soon_days",
    icon: FileText,
    suffixKey: "days",
    min: 1,
    max: 365,
    placeholder: "3",
  },
  {
    key: "insurance_due_soon_days",
    icon: ShieldCheck,
    suffixKey: "days",
    min: 1,
    max: 3650,
    placeholder: "30",
  },
  {
    key: "inspection_due_soon_days",
    icon: TriangleAlert,
    suffixKey: "days",
    min: 1,
    max: 3650,
    placeholder: "30",
  },
];

function formatPreview(
  value: string,
  suffixKey: "minutes" | "days",
  copy: ReturnType<typeof getAdminDeadlineSettingsMessages>,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return copy.previews.empty;
  return formatMessage(copy.previews[suffixKey], { value: parsed });
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
          ride_request_cancel_grace_minutes: String(
            result.ride_request_cancel_grace_minutes,
          ),
          ride_request_edit_grace_minutes: String(
            result.ride_request_edit_grace_minutes,
          ),
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
  }, [canRead, copy]);

  const previews = useMemo(
    () =>
      MODULES.reduce(
        (accumulator, module) => {
          accumulator[module.key] = formatPreview(
            values[module.key],
            module.suffixKey,
            copy,
          );
          return accumulator;
        },
        {} as Record<DeadlineFieldKey, string>,
      ),
    [values, copy],
  );

  async function handleSave() {
    if (!canWrite) return;

    const parsed = MODULES.map((module) => ({
      key: module.key,
      value: Number(values[module.key]),
      min: module.min,
      max: module.max,
    }));

    const invalid = parsed.find(
      ({ value, min, max }) =>
        !Number.isFinite(value) || value < min || value > max,
    );
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
        insurance_due_soon_days: Math.trunc(
          Number(values.insurance_due_soon_days),
        ),
        inspection_due_soon_days: Math.trunc(
          Number(values.inspection_due_soon_days),
        ),
      });

      setValues({
        ride_request_cancel_grace_minutes: String(
          saved.ride_request_cancel_grace_minutes,
        ),
        ride_request_edit_grace_minutes: String(
          saved.ride_request_edit_grace_minutes,
        ),
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
            <h1
              className={cn(
                "text-2xl font-extrabold tracking-tight",
                adminHeadingClass,
              )}
            >
              {copy.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
              {copy.description}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => {
          const Icon = module.icon;
          const moduleCopy = copy.modules[module.key];
          return (
            <div
              key={module.key}
              className={cn(adminCardClass, "rounded-2xl p-4")}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-[#1C3A34]/8 p-2 text-[#1C3A34]">
                    <Icon className="size-4" />
                  </div>
                  <p className="text-sm font-semibold text-[#1C3A34]">
                    {moduleCopy.title}
                  </p>
                </div>
                <Badge variant="outline" className="bg-white text-slate-600">
                  {previews[module.key]}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                {moduleCopy.description}
              </p>
            </div>
          );
        })}
      </div>

      <div className={cn(adminCardClass, "space-y-6 rounded-2xl p-5 sm:p-6")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className={cn("text-base", adminHeadingClass)}>
              {copy.configure.title}
            </h2>
            <p className="text-sm text-slate-500">
              {copy.configure.description}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {MODULES.map((module) => {
            const moduleCopy = copy.modules[module.key];
            const suffixLabel = (module.suffixKey === "minutes"
              ? formatMessage(copy.previews.minutes, { value: "" })
              : formatMessage(copy.previews.days, { value: "" })
            ).trim();

            return (
              <div
                key={module.key}
                className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <module.icon className="size-4 text-[#1C3A34]" />
                    <p className="text-sm font-semibold text-slate-800">
                      {moduleCopy.title}
                    </p>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    Current: {previews[module.key]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{moduleCopy.helper}</p>

                <div className="mt-4 space-y-2">
                  <label
                    className="text-sm font-medium text-slate-700"
                    htmlFor={module.key}
                  >
                    {moduleCopy.label} ({suffixLabel})
                  </label>
                  <Input
                    id={module.key}
                    type="number"
                    min={module.min}
                    max={module.max}
                    value={values[module.key]}
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        [module.key]: event.target.value,
                      }))
                    }
                    disabled={loading || saving || !canWrite}
                    placeholder={module.placeholder}
                    className={cn("w-full", adminInputClass)}
                  />
                  <p className="text-xs leading-relaxed text-slate-500">
                    {formatMessage(copy.configure.rangeInfo, {
                      min: module.min,
                      max: module.max,
                      suffix: suffixLabel,
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {canWrite ? (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-4">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className={adminPrimaryButtonClass}
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {saving ? copy.configure.savingButton : copy.configure.saveButton}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
