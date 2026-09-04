"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { DeleteConfirmModal } from "@/components/shared/delete-confirm-modal";
import { formatMessage, getAdminPaymentGatewaySettingsMessages } from "@/translations";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { PERMISSIONS } from "@/lib/permissions";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminCardClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  hasRequiredDetails,
  isMethodReady,
  isSecretPaymentFieldKey,
  maskSecretPaymentFieldValue,
  requiredFieldLabel,
} from "@/lib/payment-gateway";
import {
  fetchPaymentGatewaySettings,
  updatePaymentGatewaySettings,
  type PaymentGatewayField,
  type PaymentGatewayMethod,
} from "@/lib/system-settings-api";
import { PaymentMethodLogo } from "@/components/billing/payment-method-logo";
import { PaymentMethodFormSheet } from "./payment-method-form-sheet";

function PaymentGatewaySettingsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {[0, 1].map((section) => (
        <div
          key={section}
          className={cn(adminCardClass, "flex flex-col justify-between rounded-2xl border p-5 sm:p-6")}
        >
          <div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-20 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-4 w-4/5" />
            <div className="mt-5 space-y-2">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CredentialFieldRow({ field }: { field: PaymentGatewayField }) {
  const isSecret = isSecretPaymentFieldKey(field.key);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(field.value);
      setCopied(true);
      showSuccessToast({
        title: "Copied to clipboard",
        description: `${field.label || field.key} copied.`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showErrorToast({
        title: "Copy failed",
        description: "Unable to copy to clipboard.",
      });
    }
  }

  const displayValue = isSecret
    ? revealed
      ? field.value
      : maskSecretPaymentFieldValue(field.value)
    : field.value;

  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3 py-2.5 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:border-slate-700">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
            {field.label || field.key}
          </span>
          <span className="rounded bg-slate-200/50 px-1 py-0.2 font-mono text-[9px] font-medium uppercase text-slate-400 dark:bg-slate-800">
            {field.key}
          </span>
        </div>
        <p className="mt-0.5 truncate font-mono text-xs font-medium text-slate-900 select-all dark:text-slate-200">
          {displayValue}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {isSecret ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setRevealed((prev) => !prev)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            title={revealed ? "Hide value" : "Reveal value"}
          >
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </Button>
        ) : null}

        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          title="Copy value"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function PaymentGatewaySettingsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminPaymentGatewaySettingsMessages(locale);

  const canRead = hasPermission(PERMISSIONS.system_settings.read);
  const canWrite = hasPermission(PERMISSIONS.system_settings.write);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [methods, setMethods] = useState<PaymentGatewayMethod[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentGatewayMethod | null>(null);
  const [methodToDelete, setMethodToDelete] = useState<PaymentGatewayMethod | null>(null);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const settings = await fetchPaymentGatewaySettings();
        if (!cancelled) {
          setMethods(settings.methods);
        }
      } catch (error) {
        if (!cancelled) {
          showErrorToast({
            title: copy.toast.loadFailed.title,
            description:
              error instanceof Error ? error.message : copy.toast.loadFailed.description,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canRead, copy.toast.loadFailed.description, copy.toast.loadFailed.title]);

  function methodsForSave(nextMethods: PaymentGatewayMethod[]) {
    return nextMethods.map((method, index) => ({
      ...method,
      enabled: method.enabled && hasRequiredDetails(method),
      sort_order: index,
    }));
  }

  async function persist(
    nextMethods: PaymentGatewayMethod[],
    toast: { title: string; description: string },
  ) {
    setSaving(true);
    try {
      const updated = await updatePaymentGatewaySettings({
        methods: methodsForSave(nextMethods),
      });
      setMethods(updated.methods);
      showSuccessToast({
        title: toast.title,
        description: toast.description,
      });
    } catch (error) {
      showErrorToast({
        title: copy.toast.updateFailed.title,
        description:
          error instanceof Error ? error.message : copy.toast.updateFailed.description,
      });
      throw error;
    } finally {
      setSaving(false);
    }
  }

  function openCreateSheet() {
    setEditingMethod(null);
    setSheetOpen(true);
  }

  function openEditSheet(method: PaymentGatewayMethod) {
    setEditingMethod(method);
    setSheetOpen(true);
  }

  async function handleSheetSubmit(method: PaymentGatewayMethod) {
    const nextMethods = editingMethod
      ? methods.map((item) => (item.id === method.id ? method : item))
      : [...methods, method];
    await persist(nextMethods, editingMethod ? copy.toast.updated : copy.toast.created);
  }

  async function handleEnabledChange(method: PaymentGatewayMethod, enabled: boolean) {
    const next = { ...method, enabled };
    if (enabled && !hasRequiredDetails(next)) {
      showErrorToast({
        title: copy.toast.requiredField.title,
        description: formatMessage(copy.toast.requiredField.description, {
          field: requiredFieldLabel(next),
        }),
      });
      return;
    }

    await persist(
      methods.map((item) => (item.id === method.id ? next : item)),
      copy.toast.updated,
    );
  }

  async function handleDelete() {
    if (!methodToDelete) return;

    const remaining = methods
      .filter((method) => method.id !== methodToDelete.id)
      .map((method) => (hasRequiredDetails(method) ? method : { ...method, enabled: false }));

    await persist(remaining, copy.toast.deleted);
    setMethodToDelete(null);
  }

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      {canWrite ? (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            onClick={openCreateSheet}
            disabled={saving || loading}
            className={cn(adminPrimaryButtonClass, "shadow-2xs")}
          >
            <Plus className="size-4" />
            {copy.add.button}
          </Button>
        </div>
      ) : null}

      {loading ? (
        <PaymentGatewaySettingsSkeleton />
      ) : methods.length === 0 ? (
        <div
          className={cn(
            adminCardClass,
            "flex flex-col items-center justify-center rounded-2xl border-dashed px-6 py-14 text-center",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
            <CreditCard className="size-6 text-slate-400" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-foreground">
            {copy.empty.title}
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-slate-500 dark:text-muted-foreground">
            {copy.empty.description}
          </p>
          {canWrite ? (
            <Button
              type="button"
              onClick={openCreateSheet}
              className={cn(adminPrimaryButtonClass, "mt-5")}
            >
              <Plus className="size-4" />
              {copy.add.button}
            </Button>
          ) : null}
        </div>
      ) : (
        /* Multi-Column Responsive Grid Layout (no full-screen stretching) */
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {methods.map((method) => {
            const incomplete = method.enabled && !isMethodReady(method);
            const filledFields = method.fields.filter((field) => field.value.trim());

            return (
              <section
                key={method.id}
                className={cn(
                  adminCardClass,
                  "flex flex-col justify-between rounded-2xl border shadow-2xs transition-all duration-200 hover:shadow-md",
                  !method.enabled && "opacity-75 bg-slate-50/40 dark:bg-muted/10",
                )}
              >
                <div>
                  {/* Card Header: Logo, Name, Badge & Actions */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-border">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                        <PaymentMethodLogo method={method} size="sm" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-base font-bold text-slate-900 dark:text-foreground">
                            {method.name}
                          </h2>

                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
                              method.enabled
                                ? incomplete
                                  ? adminBadgeGoldClass
                                  : adminBadgeSuccessClass
                                : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400",
                            )}
                          >
                            <span
                              className={cn(
                                "mr-1 size-1.5 rounded-full inline-block",
                                method.enabled
                                  ? incomplete
                                    ? "bg-amber-500"
                                    : "bg-emerald-500"
                                  : "bg-slate-400",
                              )}
                            />
                            {!method.enabled
                              ? copy.status.off
                              : incomplete
                                ? copy.status.incomplete
                                : copy.status.on}
                          </Badge>
                        </div>

                        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          {method.kind === "stripe" ? "Card Gateway" : "Direct Transfer"}
                        </p>
                      </div>
                    </div>

                    {/* Controls: Switch & Buttons */}
                    {canWrite ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <Switch
                          checked={method.enabled}
                          onCheckedChange={(enabled) => void handleEnabledChange(method, enabled)}
                          disabled={saving}
                          aria-label={copy.fields.enabled}
                        />

                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-slate-400 hover:bg-slate-100 hover:text-[var(--brand-primary)] dark:hover:bg-slate-800"
                            disabled={saving}
                            aria-label={copy.actions.edit}
                            onClick={() => openEditSheet(method)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            disabled={saving}
                            aria-label={copy.actions.remove}
                            onClick={() => setMethodToDelete(method)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {/* Card Content: Description & Fields */}
                  <div className="p-5 space-y-3.5">
                    {method.description ? (
                      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {method.description}
                      </p>
                    ) : null}

                    {filledFields.length > 0 ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <KeyRound className="size-3" />
                          <span>Credentials</span>
                        </div>

                        <div className="space-y-2">
                          {filledFields.map((field) => (
                            <CredentialFieldRow key={field.key} field={field} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-amber-200/80 bg-amber-50/40 p-3 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400">
                        <p className="font-semibold">{copy.status.incomplete}</p>
                        <p className="mt-0.5 text-amber-600 dark:text-amber-500">
                          No credentials configured yet.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}

          {/* Quick "Add Method" Card Slot */}
          {canWrite ? (
            <button
              type="button"
              onClick={openCreateSheet}
              className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200/90 bg-slate-50/40 p-6 text-center transition-all hover:border-[var(--brand-primary)]/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/20 dark:hover:border-slate-700"
            >
              <div className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
                <Plus className="size-5 text-slate-600 dark:text-slate-300" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-foreground">
                {copy.add.button}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Configure Telebirr, CBE Birr, Stripe, or another method
              </p>
            </button>
          ) : null}
        </div>
      )}

      {!canWrite && !loading ? (
        <div className={cn(adminCardClass, "rounded-xl px-5 py-3.5")}>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            {copy.configure.readOnlyHint}
          </p>
        </div>
      ) : null}

      {saving ? (
        <p className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="size-3.5 animate-spin" />
          {copy.configure.savingButton}
        </p>
      ) : null}

      <PaymentMethodFormSheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setEditingMethod(null);
        }}
        copy={copy}
        existingMethods={methods}
        method={editingMethod}
        onSubmit={handleSheetSubmit}
      />

      <DeleteConfirmModal
        open={Boolean(methodToDelete)}
        onOpenChange={(open) => {
          if (!open) setMethodToDelete(null);
        }}
        title={formatMessage(copy.delete.title, { name: methodToDelete?.name ?? "" })}
        description={copy.delete.description}
        confirmLabel={copy.delete.confirm}
        cancelLabel={copy.delete.cancel}
        deletingLabel={copy.delete.deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
