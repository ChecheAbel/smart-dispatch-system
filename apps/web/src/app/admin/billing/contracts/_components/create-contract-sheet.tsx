"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Clock,
  Coins,
  FileText,
  Info,
  Layers,
  MapPin,
  Percent,
  Receipt,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  ContractBillingInterval,
  ContractStatus,
  LatePaymentType,
  Region,
  VehicleClass,
  VehicleType,
} from "@smart-dispatch/types";
import { isPercentLatePaymentType } from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  latePaymentType: LatePaymentType;
  latePaymentFee: string;
  regionIds: string[];
  vehicleTypeIds: string[];
  vehicleClassIds: string[];
};

const emptyForm: FormState = {
  title: "",
  status: "draft",
  notes: "",
  billingInterval: "",
  paymentTermsDays: "30",
  latePaymentType: "none",
  latePaymentFee: "",
  regionIds: [],
  vehicleTypeIds: [],
  vehicleClassIds: [],
};

const CONTRACT_STATUSES: ContractStatus[] = [
  "draft",
  "active",
  "expired",
  "cancelled",
];

const CONTRACT_BILLING_INTERVALS: ContractBillingInterval[] = [
  "per_trip",
  "at_contract_end",
  "monthly",
  "quarterly",
  "annually",
];

const LATE_PAYMENT_TYPES: LatePaymentType[] = [
  "none",
  "flat",
  "percent",
  "flat_per_day",
  "percent_per_day",
];

function getContractUiStrings(isAm: boolean) {
  return {
    actionFailed: isAm ? "እርምጃው አልተሳካም" : "Action Failed",
    sections: {
      basics: {
        title: isAm ? "የውል መሠረታዊ መረጃ እና ሁኔታ" : "Contract Basics & Agreement Terms",
        description: isAm
          ? "የውሉን ስም፣ ሁኔታ እና የንግድ ውል ማስታወሻዎችን ይግለጹ።"
          : "Define the agreement title, lifecycle status, and commercial remarks.",
      },
      billing: {
        title: isAm ? "የክፍያ ዑደት እና የመክፈያ ውሎች" : "Billing Cycle & Payment Terms",
        description: isAm
          ? "ደረሰኞች መቼ እንደሚወጡ፣ የመክፈያ ጊዜ እና የዘገየ ክፍያ ቅጣቶችን ይወስኑ።"
          : "Configure invoicing frequency, payment due windows, and overdue penalty policies.",
        termsPresets: isAm ? "ፈጣን ቀናት:" : "Quick Terms:",
        presetsList: [
          { label: isAm ? "15 ቀናት" : "Net 15", value: "15" },
          { label: isAm ? "30 ቀናት" : "Net 30", value: "30" },
          { label: isAm ? "45 ቀናት" : "Net 45", value: "45" },
          { label: isAm ? "60 ቀናት" : "Net 60", value: "60" },
        ],
        daysUnit: isAm ? "ቀናት" : "days",
      },
      scope: {
        title: isAm ? "የተሸፈነ የሥራ ወሰን (ክልል እና ተሽከርካሪዎች)" : "Operational Scope & Fleet Eligibility",
        description: isAm
          ? "በዚህ ውል ስር ጉዞዎችን ለማካሄድ የተፈቀዱ ክልሎችን እና የተሽከርካሪ ዓይነቶችን ይምረጡ።"
          : "Select approved service regions and eligible vehicle categories for this contract.",
        selectAll: isAm ? "ሁሉንም ምረጥ" : "Select all",
        clearAll: isAm ? "አጽዳ" : "Clear",
        selectedBadge: (count: number, total: number) =>
          isAm ? `${count} ከ ${total} ተመርጧል` : `${count} of ${total} selected`,
      },
    },
    footerSummary: {
      scopePill: (regions: number, types: number) =>
        isAm
          ? `${regions} ክልሎች · ${types} ተሽከርካሪዎች`
          : `${regions} Regions · ${types} Vehicle Types`,
    },
  };
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof FileText;
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

function ScopeCardSelector({
  label,
  items,
  selectedIds,
  onChange,
  disabled,
  error,
  required,
  ui,
}: {
  label: string;
  items: Array<{ id: string; label: string }>;
  selectedIds: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  ui: ReturnType<typeof getContractUiStrings>;
}) {
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(items.map((i) => i.id));
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border p-3.5 shadow-sm transition-all dark:bg-card",
        error
          ? "border-red-300 bg-red-50/30 ring-1 ring-red-300/60 dark:border-red-500/40 dark:bg-red-950/15 dark:ring-red-500/30"
          : "border-slate-200/90 bg-white dark:border-border",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b pb-2.5",
          error
            ? "border-red-200/70 dark:border-red-500/30"
            : "border-slate-100 dark:border-border/60",
        )}
      >
        <div>
          <Label
            className={cn(
              "text-xs font-bold",
              error ? adminLabelErrorClass : "text-slate-800 dark:text-foreground",
            )}
          >
            {label}
            {required ? <span className="text-red-500"> *</span> : null}
          </Label>
          <p className={cn("text-[10px]", error ? "text-red-500/80 dark:text-red-300/80" : "text-slate-400")}>
            {ui.sections.scope.selectedBadge(selectedIds.length, items.length)}
          </p>
        </div>

        {items.length > 0 ? (
          <button
            type="button"
            disabled={disabled}
            onClick={handleSelectAll}
            className="text-[11px] font-semibold text-[var(--brand-primary)] hover:underline dark:text-[var(--brand-accent)] disabled:opacity-50"
          >
            {allSelected ? ui.sections.scope.clearAll : ui.sections.scope.selectAll}
          </button>
        ) : null}
      </div>

      <div className="mt-2.5 max-h-52 space-y-1 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">—</p>
        ) : (
          items.map((item) => {
            const checked = selectedIds.includes(item.id);
            return (
              <label
                key={item.id}
                className={cn(
                  "flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                  checked
                    ? "bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)] text-slate-900 dark:bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] dark:text-foreground"
                    : "text-slate-600 hover:bg-slate-50 dark:text-muted-foreground dark:hover:bg-muted/40",
                  disabled && "cursor-not-allowed opacity-50",
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
                  className="size-4"
                />
                <span className="truncate">{item.label}</span>
              </label>
            );
          })
        )}
      </div>

      {error ? (
        <p className={cn("mt-2", adminErrorMessageClass)}>{error}</p>
      ) : null}
    </div>
  );
}

const fieldClassName = cn(adminInputClass, "w-full");
const selectTriggerClassName = cn(
  adminInputClass,
  "w-full transition-all hover:border-slate-300 dark:hover:border-slate-600",
);
const textareaClassName =
  "flex min-h-[85px] w-full resize-y rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-border dark:bg-muted/55 dark:text-foreground";

export function CreateContractSheet({
  open,
  onOpenChange,
  mode = "create",
  contractId = null,
  onSuccess,
}: CreateContractSheetProps) {
  const { locale } = useLocale();
  const copy = getAdminContractsMessages(locale);
  const isAm = locale === "am";
  const ui = useMemo(() => getContractUiStrings(isAm), [isAm]);
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
        const [regionsResult, vehicleTypesResult, vehicleClassesResult] =
          await Promise.all([
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
              contract.payment_terms_days != null
                ? String(contract.payment_terms_days)
                : "",
            latePaymentType: contract.late_payment_type ?? "none",
            latePaymentFee:
              contract.late_payment_fee != null ? String(contract.late_payment_fee) : "",
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

  const statusOptions = useMemo(
    () =>
      CONTRACT_STATUSES.map((status) => ({
        value: status,
        label: copy.status[status],
      })),
    [copy.status],
  );

  const billingIntervalOptions = useMemo(
    () =>
      CONTRACT_BILLING_INTERVALS.map((interval) => ({
        value: interval,
        label: copy.billingIntervals[interval],
      })),
    [copy.billingIntervals],
  );

  const latePaymentTypeOptions = useMemo(
    () =>
      LATE_PAYMENT_TYPES.map((type) => ({
        value: type,
        label: copy.latePaymentTypes[type],
      })),
    [copy.latePaymentTypes],
  );

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) nextErrors.title = copy.errors.titleRequired;
    if (form.regionIds.length === 0)
      nextErrors.regionIds = copy.errors.regionsRequired;
    if (form.vehicleTypeIds.length === 0)
      nextErrors.vehicleTypeIds = copy.errors.vehicleTypesRequired;
    if (form.vehicleClassIds.length === 0)
      nextErrors.vehicleClassIds = copy.errors.vehicleClassesRequired;

    if (!form.billingInterval) {
      nextErrors.billingInterval = copy.errors.billingIntervalRequired;
    }

    if (form.billingInterval) {
      if (!form.paymentTermsDays.trim()) {
        nextErrors.paymentTermsDays = copy.errors.paymentTermsRequired;
      } else {
        const paymentTermsDays = Number(form.paymentTermsDays);
        if (
          !Number.isInteger(paymentTermsDays) ||
          paymentTermsDays < 0 ||
          paymentTermsDays > 365
        ) {
          nextErrors.paymentTermsDays = copy.errors.paymentTermsInvalid;
        }
      }
    }

    if (form.latePaymentType !== "none") {
      const fee = Number(form.latePaymentFee);
      if (!form.latePaymentFee.trim() || !Number.isFinite(fee) || fee < 0) {
        nextErrors.latePaymentFee = copy.errors.latePaymentFeeRequired;
      } else if (isPercentLatePaymentType(form.latePaymentType) && (fee <= 0 || fee > 100)) {
        nextErrors.latePaymentFee = copy.errors.latePaymentPercentInvalid;
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
      payment_terms_days: Number(form.paymentTermsDays),
      late_payment_type: form.latePaymentType,
      late_payment_fee:
        form.latePaymentType === "none" ? null : Number(form.latePaymentFee),
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
        title: isEdit
          ? copy.toast.updateSuccess.title
          : copy.toast.createSuccess.title,
        description: formatMessage(
          isEdit
            ? copy.toast.updateSuccess.description
            : copy.toast.createSuccess.description,
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

  const isPercent = isPercentLatePaymentType(form.latePaymentType);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden border-l border-slate-200 bg-[#f8fafb] p-0 data-[side=right]:sm:max-w-3xl data-[side=right]:lg:max-w-4xl dark:border-border dark:bg-background"
      >
        {/* Top Gradient Banner & Header */}
        <div className="relative border-b border-slate-200 bg-white dark:border-border dark:bg-card">
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--brand-primary)] via-[#28574d] to-[var(--brand-accent)]" />
          <SheetHeader className="px-6 py-4 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-primary)_10%,transparent)] ring-1 ring-[var(--brand-primary)]/20 dark:bg-accent">
                <FileText className="size-5 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
              </div>
              <div>
                <SheetTitle className={cn("text-lg font-bold tracking-tight", adminHeadingClass)}>
                  {isEdit ? copy.form.editTitle : copy.form.createTitle}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 dark:text-muted-foreground">
                  {isEdit ? copy.form.editDescription : copy.form.createDescription}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Form Container */}
        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5 sm:px-7">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-xs text-slate-500 dark:border-border dark:bg-card dark:text-muted-foreground">
                <div className="size-4 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
                {copy.form.loading}
              </div>
            ) : null}

            {/* SECTION 1: Agreement Basics */}
            <FormSection
              icon={FileText}
              title={ui.sections.basics.title}
              description={ui.sections.basics.description}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="contract-title"
                      className={cn(
                        "text-xs font-semibold text-slate-700 dark:text-foreground",
                        errors.title && adminLabelErrorClass,
                      )}
                    >
                      {copy.form.title} <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Input
                    id="contract-title"
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder={copy.form.titlePlaceholder}
                    disabled={formDisabled}
                    aria-invalid={Boolean(errors.title)}
                    className={cn(fieldClassName, errors.title && adminFieldErrorClass)}
                  />
                  {errors.title ? (
                    <p className={adminErrorMessageClass}>{errors.title}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="contract-status"
                    className="text-xs font-semibold text-slate-700 dark:text-foreground"
                  >
                    {copy.form.status} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    items={statusOptions}
                    value={form.status}
                    onValueChange={(value) =>
                      updateField("status", value as ContractStatus)
                    }
                    disabled={formDisabled}
                  >
                    <SelectTrigger
                      id="contract-status"
                      className={cn(selectTriggerClassName, errors.status && adminFieldErrorClass)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {statusOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="contract-notes"
                    className="text-xs font-semibold text-slate-700 dark:text-foreground"
                  >
                    {copy.form.notes}
                  </Label>
                  <span className="text-[11px] text-slate-400">{copy.form.optional}</span>
                </div>
                <textarea
                  id="contract-notes"
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  placeholder={copy.form.notesPlaceholder}
                  disabled={formDisabled}
                  className={textareaClassName}
                />
              </div>
            </FormSection>

            {/* SECTION 2: Invoicing & Payment Terms */}
            <FormSection
              icon={Receipt}
              title={ui.sections.billing.title}
              description={ui.sections.billing.description}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="contract-billing-interval"
                    className={cn(
                      "text-xs font-semibold text-slate-700 dark:text-foreground",
                      errors.billingInterval && adminLabelErrorClass,
                    )}
                  >
                    {copy.form.billingInterval} <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    items={billingIntervalOptions}
                    value={form.billingInterval}
                    onValueChange={(value) => {
                      updateField("billingInterval", value as ContractBillingInterval);
                    }}
                    disabled={formDisabled}
                  >
                    <SelectTrigger
                      id="contract-billing-interval"
                      aria-invalid={Boolean(errors.billingInterval)}
                      className={cn(
                        selectTriggerClassName,
                        errors.billingInterval && adminFieldErrorClass,
                      )}
                    >
                      <SelectValue placeholder={copy.form.billingIntervalPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {billingIntervalOptions.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {errors.billingInterval ? (
                    <p className={adminErrorMessageClass}>{errors.billingInterval}</p>
                  ) : null}
                </div>

                {form.billingInterval ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="contract-payment-terms"
                        className={cn(
                          "text-xs font-semibold text-slate-700 dark:text-foreground",
                          errors.paymentTermsDays && adminLabelErrorClass,
                        )}
                      >
                        {copy.form.paymentTermsDays} <span className="text-red-500">*</span>
                      </Label>
                      <span className="text-[11px] text-slate-400">{ui.sections.billing.daysUnit}</span>
                    </div>
                    <Input
                      id="contract-payment-terms"
                      type="number"
                      min={0}
                      max={365}
                      value={form.paymentTermsDays}
                      onChange={(event) => updateField("paymentTermsDays", event.target.value)}
                      placeholder={copy.form.paymentTermsDaysPlaceholder}
                      disabled={formDisabled}
                      aria-invalid={Boolean(errors.paymentTermsDays)}
                      className={cn(fieldClassName, errors.paymentTermsDays && adminFieldErrorClass)}
                    />

                    {/* Quick presets */}
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400">
                        {ui.sections.billing.termsPresets}
                      </span>
                      {ui.sections.billing.presetsList.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          disabled={formDisabled}
                          onClick={() => updateField("paymentTermsDays", preset.value)}
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                            form.paymentTermsDays === preset.value
                              ? "bg-[var(--brand-primary)] text-white dark:bg-[var(--brand-accent)] dark:text-[#171a1f]"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-muted dark:text-muted-foreground",
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {errors.paymentTermsDays ? (
                      <p className={adminErrorMessageClass}>
                        {errors.paymentTermsDays}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {form.billingInterval === "at_contract_end" ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300">
                  <p>{copy.form.atContractEndHint}</p>
                </div>
              ) : null}

              {/* Late Payment Surcharges */}
              {form.billingInterval ? (
                <div className="grid gap-4 pt-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="contract-late-payment-type"
                      className="text-xs font-semibold text-slate-700 dark:text-foreground"
                    >
                      {copy.form.latePaymentType}
                    </Label>
                    <Select
                      items={latePaymentTypeOptions}
                      value={form.latePaymentType}
                      onValueChange={(value) => {
                        updateField("latePaymentType", value as LatePaymentType);
                        if (value === "none") updateField("latePaymentFee", "");
                      }}
                      disabled={formDisabled}
                    >
                      <SelectTrigger id="contract-late-payment-type" className={selectTriggerClassName}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {latePaymentTypeOptions.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-400 dark:text-muted-foreground">
                      {copy.form.latePaymentTypeHint}
                    </p>
                  </div>

                  {form.latePaymentType !== "none" ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="contract-late-payment-fee"
                          className={cn(
                            "text-xs font-semibold text-slate-700 dark:text-foreground",
                            errors.latePaymentFee && adminLabelErrorClass,
                          )}
                        >
                          {isPercent ? copy.form.latePaymentPercent : copy.form.latePaymentFee}{" "}
                          <span className="text-red-500">*</span>
                        </Label>
                      </div>
                      <div
                        className={cn(
                          "flex items-center overflow-hidden rounded-lg border shadow-sm transition-colors",
                          errors.latePaymentFee
                            ? adminInputGroupErrorClass
                            : "border-slate-200 bg-white focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40 dark:border-border dark:bg-muted/50",
                        )}
                      >
                        <Input
                          id="contract-late-payment-fee"
                          type="number"
                          min={0}
                          max={isPercent ? 100 : undefined}
                          step={isPercent ? "0.1" : "0.01"}
                          value={form.latePaymentFee}
                          onChange={(event) => updateField("latePaymentFee", event.target.value)}
                          placeholder={isPercent ? "5.0" : "500.00"}
                          disabled={formDisabled}
                          aria-invalid={Boolean(errors.latePaymentFee)}
                          className={cn(
                            "h-10 rounded-none border-0 bg-transparent px-3 text-sm font-medium tabular-nums shadow-none focus-visible:ring-0",
                            errors.latePaymentFee && "placeholder:text-red-400 text-red-900 dark:text-red-200",
                          )}
                        />
                        <span
                          className={cn(
                            "flex h-10 shrink-0 items-center border-l px-3 text-xs font-bold",
                            errors.latePaymentFee
                              ? "border-red-200 bg-red-100/50 text-red-700 dark:border-red-400/30 dark:bg-red-950/40 dark:text-red-300"
                              : "border-slate-100 bg-slate-50/80 text-slate-600 dark:border-border dark:bg-muted/60 dark:text-muted-foreground",
                          )}
                        >
                          {isPercent ? "%" : "ETB"}
                        </span>
                      </div>
                      {errors.latePaymentFee ? (
                        <p className={adminErrorMessageClass}>
                          {errors.latePaymentFee}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </FormSection>

            {/* SECTION 3: Operational Scope Multi-Selectors */}
            <FormSection
              icon={MapPin}
              title={ui.sections.scope.title}
              description={ui.sections.scope.description}
            >
              <div className="grid gap-4 lg:grid-cols-3">
                <ScopeCardSelector
                  label={copy.form.regions}
                  items={regionOptions}
                  selectedIds={form.regionIds}
                  onChange={(value) => updateField("regionIds", value)}
                  disabled={formDisabled}
                  required
                  error={errors.regionIds}
                  ui={ui}
                />

                <ScopeCardSelector
                  label={copy.form.vehicleTypes}
                  items={vehicleTypeOptions}
                  selectedIds={form.vehicleTypeIds}
                  onChange={(value) => updateField("vehicleTypeIds", value)}
                  disabled={formDisabled}
                  required
                  error={errors.vehicleTypeIds}
                  ui={ui}
                />

                <ScopeCardSelector
                  label={copy.form.vehicleClasses}
                  items={vehicleClassOptions}
                  selectedIds={form.vehicleClassIds}
                  onChange={(value) => updateField("vehicleClassIds", value)}
                  disabled={formDisabled}
                  required
                  error={errors.vehicleClassIds}
                  ui={ui}
                />
              </div>
            </FormSection>
          </div>

          {/* Sticky Sheet Footer */}
          <SheetFooter className="mt-auto flex-row items-center justify-between border-t border-slate-200 bg-white px-6 py-4 shadow-sm sm:px-7 dark:border-border dark:bg-card">
            {/* Quick summary pill */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-muted-foreground">
              <span className="font-semibold text-slate-800 dark:text-foreground">
                {form.billingInterval
                  ? copy.billingIntervals[form.billingInterval]
                  : (isAm ? "አዲስ ውል" : "Commercial Agreement")}
              </span>
              <span>·</span>
              <span>{ui.footerSummary.scopePill(form.regionIds.length, form.vehicleTypeIds.length)}</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="h-10 px-4 rounded-lg font-medium text-slate-700 hover:bg-slate-50 dark:border-border dark:text-foreground dark:hover:bg-muted"
              >
                {copy.form.cancel}
              </Button>
              <Button
                type="submit"
                className={cn(adminPrimaryButtonClass, "min-w-[130px] font-semibold")}
                disabled={formDisabled}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black dark:border-t-transparent" />
                    {isEdit ? copy.form.saving : copy.form.creating}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    {isEdit ? copy.form.save : copy.form.create}
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
