"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { FileText, MapPin, Receipt } from "lucide-react";
import type { ContractBillingInterval, ContractStatus, Region, VehicleClass, VehicleType } from "@smart-dispatch/types";
import {
  AdminFormSection,
  AdminSelectField,
  AdminTextareaField,
  AdminTextField,
} from "@/components/shared/admin-form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { adminPrimaryButtonClass } from "@/lib/admin-theme";
import { useLocale } from "@/components/shared/providers";
import {
  createContract,
  fetchContractById,
  updateContract,
} from "@/lib/contract-api";
import { fetchActiveRegions } from "@/lib/region-api";
import { fetchActiveVehicleClasses } from "@/lib/vehicle-class-api";
import { fetchActiveVehicleTypes } from "@/lib/vehicle-type-api";
import { formatMessage, getAdminContractsMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type CreateContractSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: "create" | "edit";
  contractId?: string | null;
  onSuccess?: () => void;
};

type FormState = {
  title: string;
  status: ContractStatus;
  notes: string;
  billingInterval: ContractBillingInterval | "";
  paymentTermsDays: string;
  regionIds: string[];
  vehicleTypeIds: string[];
  vehicleClassIds: string[];
};

const emptyForm: FormState = {
  title: "",
  status: "draft",
  notes: "",
  billingInterval: "",
  paymentTermsDays: "",
  regionIds: [],
  vehicleTypeIds: [],
  vehicleClassIds: [],
};

const CONTRACT_STATUSES: ContractStatus[] = ["draft", "active", "expired", "cancelled"];
const CONTRACT_BILLING_INTERVALS: ContractBillingInterval[] = [
  "per_trip",
  "monthly",
  "quarterly",
  "annually",
];

function ScopeCheckboxGroup({
  label,
  items,
  selectedIds,
  onChange,
  disabled,
  error,
  required,
}: {
  label: string;
  items: Array<{ id: string; label: string }>;
  selectedIds: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold text-slate-800">
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </Label>
      <div
        className={cn(
          "max-h-52 space-y-2 overflow-y-auto rounded-xl border bg-slate-50/60 p-3",
          error ? "border-red-300" : "border-slate-200",
        )}
      >
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">—</p>
        ) : (
          items.map((item) => {
            const checked = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) => {
                    onChange(
                      value
                        ? [...selectedIds, item.id]
                        : selectedIds.filter((id) => id !== item.id),
                    );
                  }}
                />
                <span className="text-sm text-slate-700">{item.label}</span>
              </label>
            );
          })
        )}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}

export function CreateContractSheet({
  open,
  onOpenChange,
  mode = "create",
  contractId = null,
  onSuccess,
}: CreateContractSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminContractsMessages(locale);
  const isEdit = mode === "edit";
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleClasses, setVehicleClasses] = useState<VehicleClass[]>([]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setErrors({});
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      try {
        const [regionsResult, vehicleTypesResult, vehicleClassesResult] = await Promise.all([
          fetchActiveRegions(locale),
          fetchActiveVehicleTypes(locale),
          fetchActiveVehicleClasses(locale),
        ]);

        if (!cancelled) {
          setRegions(regionsResult);
          setVehicleTypes(vehicleTypesResult);
          setVehicleClasses(vehicleClassesResult);
        }
      } catch {
        if (!cancelled) {
          setRegions([]);
          setVehicleTypes([]);
          setVehicleClasses([]);
        }
      }
    }

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [locale, open]);

  useEffect(() => {
    if (!open || !isEdit || !contractId) {
      return;
    }

    let cancelled = false;

    async function loadContract() {
      setLoading(true);
      try {
        const { contract } = await fetchContractById(contractId!, locale);
        if (!cancelled) {
          setForm({
            title: contract.title,
            status: contract.status,
            notes: contract.notes ?? "",
            billingInterval: contract.billing_interval,
            paymentTermsDays:
              contract.payment_terms_days != null ? String(contract.payment_terms_days) : "",
            regionIds: contract.region_ids,
            vehicleTypeIds: contract.vehicle_type_ids,
            vehicleClassIds: contract.vehicle_class_ids,
          });
        }
      } catch {
        if (!cancelled) {
          showErrorToast({
            title: copy.toast.loadFailed.title,
            description: copy.toast.loadFailed.description,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadContract();

    return () => {
      cancelled = true;
    };
  }, [contractId, copy.toast.loadFailed, isEdit, locale, open]);

  const regionOptions = useMemo(
    () => regions.map((region) => ({ id: region.id, label: region.name })),
    [regions],
  );

  const vehicleTypeOptions = useMemo(
    () => vehicleTypes.map((item) => ({ id: item.id, label: item.name })),
    [vehicleTypes],
  );

  const vehicleClassOptions = useMemo(
    () => vehicleClasses.map((item) => ({ id: item.id, label: item.name })),
    [vehicleClasses],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) nextErrors.title = copy.errors.titleRequired;
    if (form.regionIds.length === 0) nextErrors.regionIds = copy.errors.regionsRequired;
    if (form.vehicleTypeIds.length === 0) nextErrors.vehicleTypeIds = copy.errors.vehicleTypesRequired;
    if (form.vehicleClassIds.length === 0) nextErrors.vehicleClassIds = copy.errors.vehicleClassesRequired;

    if (!form.billingInterval) {
      nextErrors.billingInterval = copy.errors.billingIntervalRequired;
    }

    if (form.billingInterval && form.billingInterval !== "per_trip") {
      if (!form.paymentTermsDays.trim()) {
        nextErrors.paymentTermsDays = copy.errors.paymentTermsRequired;
      } else {
        const paymentTermsDays = Number(form.paymentTermsDays);
        if (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 1 || paymentTermsDays > 365) {
          nextErrors.paymentTermsDays = copy.errors.paymentTermsInvalid;
        }
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);

    const billingInterval = form.billingInterval as ContractBillingInterval;

    const payload = {
      title: form.title.trim(),
      status: form.status,
      notes: form.notes.trim() || null,
      billing_interval: billingInterval,
      payment_terms_days: billingInterval !== "per_trip" ? Number(form.paymentTermsDays) : null,
      region_ids: form.regionIds,
      vehicle_type_ids: form.vehicleTypeIds,
      vehicle_class_ids: form.vehicleClassIds,
    };

    try {
      const saved =
        isEdit && contractId
          ? await updateContract(contractId, payload)
          : await createContract(payload);

      showSuccessToast({
        title: isEdit ? copy.toast.updateSuccess.title : copy.toast.createSuccess.title,
        description: formatMessage(
          isEdit ? copy.toast.updateSuccess.description : copy.toast.createSuccess.description,
          { title: saved.title },
        ),
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      showErrorToast({
        title: copy.errors.submitFailed,
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formDisabled = submitting || loading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto data-[side=right]:sm:max-w-6xl"
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? copy.form.editTitle : copy.form.createTitle}</SheetTitle>
          <SheetDescription>
            {isEdit ? copy.form.editDescription : copy.form.createDescription}
          </SheetDescription>
        </SheetHeader>

        <form className="space-y-8 px-6 pb-6" onSubmit={(event) => void handleSubmit(event)}>
          <AdminFormSection icon={FileText} title={copy.form.title} description={copy.eyebrow}>
            <AdminSelectField
              id="contract-status"
              label={copy.form.status}
              value={form.status}
              onValueChange={(value) => updateField("status", value as ContractStatus)}
              items={CONTRACT_STATUSES.map((status) => ({
                value: status,
                label: copy.status[status],
              }))}
              disabled={formDisabled}
            />
            <AdminTextField
              id="contract-title"
              label={copy.form.title}
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder={copy.form.titlePlaceholder}
              error={errors.title}
              disabled={formDisabled}
            />
            <AdminTextareaField
              id="contract-notes"
              label={copy.form.notes}
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              placeholder={copy.form.notesPlaceholder}
              disabled={formDisabled}
            />
          </AdminFormSection>

          <AdminFormSection
            icon={Receipt}
            title={copy.form.billingTitle}
            description={copy.form.billingDescription}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminSelectField
                id="contract-billing-interval"
                label={copy.form.billingInterval}
                value={form.billingInterval || null}
                onValueChange={(value) => {
                  setForm((current) => ({
                    ...current,
                    billingInterval: value as ContractBillingInterval,
                    paymentTermsDays: value === "per_trip" ? "" : current.paymentTermsDays,
                  }));
                  setErrors((current) => ({
                    ...current,
                    billingInterval: undefined,
                    paymentTermsDays: value === "per_trip" ? undefined : current.paymentTermsDays,
                  }));
                }}
                items={CONTRACT_BILLING_INTERVALS.map((interval) => ({
                  value: interval,
                  label: copy.billingIntervals[interval],
                }))}
                placeholder={copy.form.billingIntervalPlaceholder}
                disabled={formDisabled}
                error={errors.billingInterval}
              />
              {form.billingInterval && form.billingInterval !== "per_trip" ? (
                <AdminTextField
                  id="contract-payment-terms"
                  label={copy.form.paymentTermsDays}
                  type="number"
                  min={1}
                  max={365}
                  value={form.paymentTermsDays}
                  onChange={(event) => updateField("paymentTermsDays", event.target.value)}
                  placeholder={copy.form.paymentTermsDaysPlaceholder}
                  hint={copy.form.paymentTermsDaysHint}
                  disabled={formDisabled}
                  error={errors.paymentTermsDays}
                />
              ) : null}
            </div>
          </AdminFormSection>

          <AdminFormSection
            icon={MapPin}
            title={copy.form.scopeTitle}
            description={copy.form.scopeDescription}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <ScopeCheckboxGroup
                label={copy.form.regions}
                items={regionOptions}
                selectedIds={form.regionIds}
                onChange={(value) => updateField("regionIds", value)}
                disabled={formDisabled}
                required
                error={errors.regionIds}
              />
              <ScopeCheckboxGroup
                label={copy.form.vehicleTypes}
                items={vehicleTypeOptions}
                selectedIds={form.vehicleTypeIds}
                onChange={(value) => updateField("vehicleTypeIds", value)}
                disabled={formDisabled}
                required
                error={errors.vehicleTypeIds}
              />
              <ScopeCheckboxGroup
                label={copy.form.vehicleClasses}
                items={vehicleClassOptions}
                selectedIds={form.vehicleClassIds}
                onChange={(value) => updateField("vehicleClassIds", value)}
                disabled={formDisabled}
                required
                error={errors.vehicleClassIds}
              />
            </div>
          </AdminFormSection>

          <SheetFooter className="px-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {copy.form.cancel}
            </Button>
            <Button type="submit" className={adminPrimaryButtonClass} disabled={formDisabled}>
              {submitting
                ? isEdit
                  ? copy.form.saving
                  : copy.form.creating
                : isEdit
                  ? copy.form.save
                  : copy.form.create}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
