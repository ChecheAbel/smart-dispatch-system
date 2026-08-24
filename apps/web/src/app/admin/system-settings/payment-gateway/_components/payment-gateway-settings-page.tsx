"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { hasRequiredDetails, isMethodReady, isSecretPaymentFieldKey, maskSecretPaymentFieldValue, requiredFieldLabel } from "@/lib/payment-gateway";
import {
  fetchPaymentGatewaySettings,
  updatePaymentGatewaySettings,
  type PaymentGatewayMethod,
} from "@/lib/system-settings-api";
import { PaymentMethodLogo } from "@/components/billing/payment-method-logo";
import { PaymentMethodFormSheet } from "./payment-method-form-sheet";

type Copy = ReturnType<typeof getAdminPaymentGatewaySettingsMessages>;

function PaymentGatewaySettingsSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((section) => (
        <div key={section} className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48" />
            <div className="space-y-3 rounded-xl bg-[#f8fafb] p-4 dark:bg-muted/40">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </div>
      ))}
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
    <div className="w-full space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={adminIconBoxClass}>
            <CreditCard className="size-4" />
          </div>
          <div className="min-w-0">
            <h1 className={cn("text-2xl font-extrabold tracking-tight", adminHeadingClass)}>
              {copy.title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-muted-foreground">
              {copy.description}
            </p>
          </div>
        </div>
        {canWrite ? (
          <Button
            type="button"
            onClick={openCreateSheet}
            disabled={saving || loading}
            className={cn(adminPrimaryButtonClass, "shrink-0")}
          >
            <Plus className="size-4" />
            {copy.add.button}
          </Button>
        ) : null}
      </header>

      {loading ? (
        <PaymentGatewaySettingsSkeleton />
      ) : methods.length === 0 ? (
        <div className={cn(adminCardClass, "rounded-xl border-dashed px-5 py-12 text-center")}>
          <CreditCard className="mx-auto size-6 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-foreground">
            {copy.empty.title}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-muted-foreground">
            {copy.empty.description}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {methods.map((method) => {
            const incomplete = method.enabled && !isMethodReady(method);
            const filledFields = method.fields.filter((field) => field.value.trim());

            return (
              <section key={method.id} className={cn(adminCardClass, "overflow-hidden rounded-xl")}>
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-border">
                  <div className="min-w-0 space-y-2">
                    <div className="flex h-9 items-center">
                      <PaymentMethodLogo method={method} />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-foreground">
                      {method.name}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                        method.enabled
                          ? incomplete
                            ? adminBadgeGoldClass
                            : adminBadgeSuccessClass
                          : adminBadgeGoldClass,
                      )}
                    >
                      {!method.enabled
                        ? copy.status.off
                        : incomplete
                          ? copy.status.incomplete
                          : copy.status.on}
                    </Badge>
                  </div>

                  {canWrite ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-muted-foreground">
                        <Switch
                          checked={method.enabled}
                          onCheckedChange={(enabled) => void handleEnabledChange(method, enabled)}
                          disabled={saving}
                          aria-label={copy.fields.enabled}
                        />
                        {copy.fields.enabled}
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-slate-400 hover:text-[var(--brand-primary)]"
                        disabled={saving}
                        aria-label={copy.actions.edit}
                        onClick={() => openEditSheet(method)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="text-slate-400 hover:text-red-600"
                        disabled={saving}
                        aria-label={copy.actions.remove}
                        onClick={() => setMethodToDelete(method)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className={cn("space-y-3 p-4 sm:p-5", !method.enabled && "opacity-60")}>
                  {method.description ? (
                    <p className="text-sm text-slate-500 dark:text-muted-foreground">
                      {method.description}
                    </p>
                  ) : null}
                  {filledFields.length > 0 ? (
                    <dl className="grid gap-3 sm:grid-cols-2">
                      {filledFields.map((field) => (
                        <div key={field.key}>
                          <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {field.key}
                          </dt>
                          <dd className="mt-0.5 break-all font-mono text-sm text-slate-700 dark:text-foreground">
                            {isSecretPaymentFieldKey(field.key)
                              ? maskSecretPaymentFieldValue(field.value)
                              : field.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-slate-400">{copy.status.incomplete}</p>
                  )}
                </div>
              </section>
            );
          })}
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
