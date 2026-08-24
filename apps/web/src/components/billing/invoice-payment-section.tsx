"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import type {
  CustomerInvoice,
  CustomerPaymentMethodId,
  CustomerPaymentOptions,
  PaymentGatewayMethod,
} from "@smart-dispatch/types";
import { Button } from "@/components/ui/button";
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
  adminEyebrowClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import { confirmCustomerInvoicePayment, completeStripeInvoiceCheckout, fetchCustomerPaymentOptions, startStripeInvoiceCheckout } from "@/lib/customer-billing-api";
import {
  getMethodFieldValue,
  isMethodReady,
  isStripeCheckoutMethod,
} from "@/lib/payment-gateway";
import { PaymentMethodLogo } from "@/components/billing/payment-method-logo";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getCustomerInvoicesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import type { SupportedLocale } from "@/lib/locale";

type InvoicePaymentSectionProps = {
  invoice: CustomerInvoice;
  locale: SupportedLocale;
  onInvoiceUpdated?: (invoice: CustomerInvoice) => void;
};

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function buildSteps(
  method: PaymentGatewayMethod,
  payCopy: ReturnType<typeof getCustomerInvoicesMessages>["detail"]["payment"],
  amountLabel: string,
  reference: string,
) {
  if (isStripeCheckoutMethod(method)) {
    return payCopy.stripeSteps.map((step) =>
      formatMessage(step, {
        amount: amountLabel,
        reference,
      }),
    );
  }

  const account =
    getMethodFieldValue(method, "account_number") || payCopy.accountPending;

  return payCopy.customSteps.map((step) =>
    formatMessage(step, {
      amount: amountLabel,
      reference,
      account,
      method: method.name,
    }),
  );
}

export function InvoicePaymentSection({ invoice, locale, onInvoiceUpdated }: InvoicePaymentSectionProps) {
  const copy = getCustomerInvoicesMessages(locale);
  const payCopy = copy.detail.payment;
  const [options, setOptions] = useState<CustomerPaymentOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [activeMethodId, setActiveMethodId] = useState<CustomerPaymentMethodId | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const amountLabel = formatMoney(invoice.amount_due, invoice.currency, locale);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") !== "success") return;
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    let cancelled = false;
    void (async () => {
      try {
        const result = await completeStripeInvoiceCheckout(sessionId, locale);
        const updated = result.invoices.find((item) => item.id === invoice.id);
        if (!cancelled && updated) {
          onInvoiceUpdated?.(updated);
          showSuccessToast({ title: payCopy.paymentConfirmed });
        }
      } catch {
        if (!cancelled) {
          showErrorToast({ title: payCopy.paymentConfirmFailed });
        }
      } finally {
        const url = new URL(window.location.href);
        url.searchParams.delete("checkout");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", `${url.pathname}${url.search}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [invoice.id, locale, onInvoiceUpdated, payCopy.paymentConfirmFailed, payCopy.paymentConfirmed]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const result = await fetchCustomerPaymentOptions();
        if (!cancelled) setOptions(result.payment_options);
      } catch {
        if (!cancelled) setOptions(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleMethods = useMemo(
    () => (options?.methods ?? []).filter((method) => method.enabled),
    [options],
  );

  const activeMethod = visibleMethods.find((method) => method.id === activeMethodId) ?? null;

  async function copyValue(field: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      showSuccessToast({ title: payCopy.copied });
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showErrorToast({ title: payCopy.copyFailed });
    }
  }

  async function handleConfirmPayment() {
    if (!activeMethod || confirming) return;

    setConfirming(true);
    try {
      if (isStripeCheckoutMethod(activeMethod)) {
        const path = `/dashboard/my-invoices/${invoice.id}`;
        const result = await startStripeInvoiceCheckout({
          invoice_ids: [invoice.id],
          payment_method: activeMethod.id,
          success_path: path,
          cancel_path: path,
          locale,
        });
        window.location.assign(result.checkout_url);
        return;
      }

      const result = await confirmCustomerInvoicePayment(invoice.id, {
        payment_method: activeMethod.id,
        locale,
      });
      setActiveMethodId(null);
      onInvoiceUpdated?.(result.invoice);
      showSuccessToast({ title: payCopy.paymentConfirmed });
    } catch {
      showErrorToast({ title: payCopy.paymentConfirmFailed });
    } finally {
      setConfirming(false);
    }
  }

  if (invoice.status !== "issued") {
    return null;
  }

  const detailRows =
    activeMethod?.fields
      .filter((field) => field.value.trim())
      .map((field) => ({
        key: field.key,
        label: field.label,
        value: field.value.trim(),
        mono: true,
      })) ?? [];

  const steps = activeMethod
    ? buildSteps(activeMethod, payCopy, amountLabel, invoice.reference_number)
    : [];
  const showConfigNotice = activeMethod ? !isMethodReady(activeMethod) : false;

  return (
    <>
      <section className={cn(adminCardClass, "overflow-hidden")}>
        <div className="space-y-1 border-b border-slate-100 px-5 py-4">
          <p className={adminEyebrowClass}>{payCopy.eyebrow}</p>
          <h2 className={cn("text-base", adminHeadingClass)}>{payCopy.title}</h2>
          <p className="text-sm text-slate-500">{payCopy.description}</p>
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-500">{payCopy.loading}</p>
        ) : visibleMethods.length === 0 ? (
          <div className="space-y-4 px-5 py-5">
            <div>
              <p className={adminEyebrowClass}>{payCopy.amountLabel}</p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight text-[#1C3A34]">
                {amountLabel}
              </p>
            </div>
            <CopyLine
              label={payCopy.referenceLabel}
              value={invoice.reference_number}
              fieldKey="reference"
              copiedField={copiedField}
              onCopy={copyValue}
              mono
            />
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              {payCopy.configPending ? (
                <p className="text-sm font-semibold text-amber-950">{payCopy.configPending}</p>
              ) : null}
              <p className="mt-0.5 text-sm leading-relaxed text-amber-800">
                {payCopy.configPendingNotice}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-3 px-5 py-4",
              visibleMethods.length > 1 ? "grid-cols-2" : "grid-cols-1 sm:max-w-xs",
            )}
          >
            {visibleMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setActiveMethodId(method.id)}
                className="flex min-h-[7.5rem] flex-col items-start gap-2 rounded-lg border border-slate-200/80 p-3 text-left transition-colors hover:border-[#C9B87A]/40 hover:bg-[#C9B87A]/5 sm:min-h-0 sm:p-4"
              >
                <PaymentMethodLogo method={method} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#1C3A34] sm:text-base">
                    {method.name}
                  </span>
                  {method.description ? (
                    <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500 sm:text-xs">
                      {method.description}
                    </span>
                  ) : null}
                </span>
                <span className="mt-auto text-sm font-semibold tabular-nums text-[#1C3A34]">
                  {amountLabel}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{payCopy.referenceHint}</p>
      </section>

      <Sheet open={activeMethod !== null} onOpenChange={(open) => !open && setActiveMethodId(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-md"
        >
          {activeMethod ? (
            <>
              <SheetHeader className="shrink-0 border-b border-slate-200/80 px-6 py-5 text-left">
                <div className="flex flex-col gap-3">
                  <PaymentMethodLogo method={activeMethod} size="md" />
                  <div className="space-y-1">
                    <SheetTitle className={adminHeadingClass}>{activeMethod.name}</SheetTitle>
                    <SheetDescription className="text-sm leading-relaxed text-slate-500">
                      {activeMethod.description || payCopy.customSheetDescription}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
                <div className="space-y-4 border-b border-slate-200/80 pb-6">
                  <div>
                    <p className={adminEyebrowClass}>{payCopy.amountLabel}</p>
                    <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight text-[#1C3A34]">
                      {amountLabel}
                    </p>
                    {invoice.penalty_amount > 0 ? (
                      <p className="mt-1 text-xs font-medium text-amber-800">
                        {formatMessage(payCopy.includesPenalty, {
                          penalty: formatMoney(invoice.penalty_amount, invoice.currency, locale),
                        })}
                      </p>
                    ) : null}
                  </div>
                  <CopyLine
                    label={payCopy.referenceLabel}
                    value={invoice.reference_number}
                    fieldKey="reference"
                    copiedField={copiedField}
                    onCopy={copyValue}
                    mono
                  />
                </div>

                {detailRows.length > 0 ? (
                  <div className="space-y-3">
                    <p className={adminEyebrowClass}>{payCopy.payDetailsTitle}</p>
                    <dl className="space-y-3">
                      {detailRows.map((row) => (
                        <CopyLine
                          key={row.key}
                          label={row.label}
                          value={row.value}
                          fieldKey={row.key}
                          copiedField={copiedField}
                          onCopy={copyValue}
                          mono={row.mono}
                        />
                      ))}
                    </dl>
                  </div>
                ) : null}

                {showConfigNotice ? (
                  <p className="text-sm leading-relaxed text-amber-800">{payCopy.configPendingNotice}</p>
                ) : null}

                <div className="space-y-3">
                  <p className={adminEyebrowClass}>{payCopy.stepsTitle}</p>
                  <ol className="space-y-3 text-sm leading-relaxed text-slate-600">
                    {steps.map((step, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="w-5 shrink-0 font-semibold tabular-nums text-[#C9B87A]">
                          {index + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <p className="text-xs leading-relaxed text-slate-500">{payCopy.referenceHint}</p>
              </div>

              <SheetFooter className="shrink-0 border-t border-slate-200/80 px-6 py-4">
                <Button
                  type="button"
                  className={cn(adminPrimaryButtonClass, "w-full")}
                  disabled={confirming || showConfigNotice}
                  onClick={() => void handleConfirmPayment()}
                >
                  {confirming
                    ? isStripeCheckoutMethod(activeMethod)
                      ? payCopy.redirectingToStripe
                      : payCopy.confirmingPayment
                    : isStripeCheckoutMethod(activeMethod)
                      ? payCopy.payWithStripe
                      : payCopy.confirmPayment}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function CopyLine({
  label,
  value,
  fieldKey,
  copiedField,
  onCopy,
  mono,
}: {
  label: string;
  value: string;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (field: string, value: string) => void;
  mono?: boolean;
}) {
  const copied = copiedField === fieldKey;

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</dt>
        <dd className={cn("mt-0.5 text-sm font-semibold text-[#1C3A34]", mono && "font-mono")}>
          {value}
        </dd>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-slate-500"
        aria-label={label}
        onClick={() => void onCopy(fieldKey, value)}
      >
        {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
      </Button>
    </div>
  );
}
