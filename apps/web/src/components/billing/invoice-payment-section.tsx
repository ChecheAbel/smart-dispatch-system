"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Copy } from "lucide-react";
import type { CustomerInvoice, CustomerPaymentMethodId, CustomerPaymentOptions } from "@smart-dispatch/types";
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
import { confirmCustomerInvoicePayment, fetchCustomerPaymentOptions } from "@/lib/customer-billing-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getCustomerInvoicesMessages } from "@/translations";
import { cn } from "@/lib/utils";

const PAYMENT_PROVIDER_LOGOS: Record<CustomerPaymentMethodId, { src: string; width: number; height: number }> = {
  telebirr: { src: "/providers/telebirr.webp", width: 140, height: 48 },
  cbe_birr: { src: "/providers/cbe-birr.webp", width: 140, height: 48 },
};

type InvoicePaymentSectionProps = {
  invoice: CustomerInvoice;
  locale: string;
  onInvoiceUpdated?: (invoice: CustomerInvoice) => void;
};

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function InvoicePaymentSection({ invoice, locale, onInvoiceUpdated }: InvoicePaymentSectionProps) {
  const copy = getCustomerInvoicesMessages(locale);
  const payCopy = copy.detail.payment;
  const [options, setOptions] = useState<CustomerPaymentOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [activeMethod, setActiveMethod] = useState<CustomerPaymentMethodId | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const amountLabel = formatMoney(invoice.total_amount, invoice.currency, locale);

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
      const result = await confirmCustomerInvoicePayment(invoice.id, {
        payment_method: activeMethod,
        locale,
      });
      setActiveMethod(null);
      onInvoiceUpdated?.(result.invoice);
      showSuccessToast({ title: payCopy.paymentConfirmed });
    } catch {
      showErrorToast({ title: payCopy.paymentConfirmFailed });
    } finally {
      setConfirming(false);
    }
  }

  const methods: Array<{
    id: CustomerPaymentMethodId;
    title: string;
    description: string;
    enabled: boolean;
  }> = [
    {
      id: "telebirr",
      title: payCopy.telebirrTitle,
      description: payCopy.telebirrDescription,
      enabled: options?.telebirr.enabled ?? true,
    },
    {
      id: "cbe_birr",
      title: payCopy.cbeTitle,
      description: payCopy.cbeDescription,
      enabled: options?.cbe_birr.enabled ?? true,
    },
  ];

  const visibleMethods = methods.filter((method) => method.enabled);
  if (invoice.status !== "issued" || (!loading && visibleMethods.length === 0)) {
    return null;
  }

  const telebirr = options?.telebirr;
  const cbe = options?.cbe_birr;

  const sheetTitle =
    activeMethod === "telebirr"
      ? payCopy.telebirrTitle
      : activeMethod === "cbe_birr"
        ? payCopy.cbeTitle
        : "";

  const sheetDescription =
    activeMethod === "telebirr"
      ? payCopy.telebirrSheetDescription
      : activeMethod === "cbe_birr"
        ? payCopy.cbeSheetDescription
        : "";

  const steps =
    activeMethod === "telebirr"
      ? payCopy.telebirrSteps.map((step) =>
          formatMessage(step, {
            amount: amountLabel,
            reference: invoice.reference_number,
            short_code: telebirr?.short_code ?? payCopy.merchantCodePending,
          }),
        )
      : activeMethod === "cbe_birr"
        ? payCopy.cbeSteps.map((step) =>
            formatMessage(step, {
              amount: amountLabel,
              reference: invoice.reference_number,
              account: cbe?.account_number ?? payCopy.accountPending,
            }),
          )
        : [];

  const detailRows: Array<{ key: string; label: string; value: string; mono?: boolean }> = [];
  if (activeMethod === "telebirr") {
    if (telebirr?.merchant_name) {
      detailRows.push({ key: "merchant", label: payCopy.merchantLabel, value: telebirr.merchant_name });
    }
    if (telebirr?.short_code) {
      detailRows.push({
        key: "telebirr-code",
        label: payCopy.telebirrShortCodeLabel,
        value: telebirr.short_code,
        mono: true,
      });
    }
    if (telebirr?.ussd) {
      detailRows.push({
        key: "telebirr-ussd",
        label: payCopy.telebirrUssdLabel,
        value: telebirr.ussd,
        mono: true,
      });
    }
  }
  if (activeMethod === "cbe_birr") {
    if (cbe?.account_name) {
      detailRows.push({ key: "cbe-name", label: payCopy.accountNameLabel, value: cbe.account_name });
    }
    if (cbe?.account_number) {
      detailRows.push({
        key: "cbe-account",
        label: payCopy.accountNumberLabel,
        value: cbe.account_number,
        mono: true,
      });
    }
  }

  const showConfigNotice =
    (activeMethod === "telebirr" && !telebirr?.short_code) ||
    (activeMethod === "cbe_birr" && !cbe?.account_number);

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
        ) : (
          <div
            className={cn(
              "grid gap-3 px-5 py-4",
              visibleMethods.length > 1 ? "grid-cols-2" : "grid-cols-1 sm:max-w-xs",
            )}
          >
            {visibleMethods.map((method) => {
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setActiveMethod(method.id)}
                  className="flex min-h-[7.5rem] flex-col items-start gap-2 rounded-lg border border-slate-200/80 p-3 text-left transition-colors hover:border-[#C9B87A]/40 hover:bg-[#C9B87A]/5 sm:min-h-0 sm:p-4"
                >
                  <PaymentProviderLogo methodId={method.id} title={method.title} size="card" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[#1C3A34] sm:text-base">
                      {method.title}
                    </span>
                    <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500 sm:text-xs">
                      {method.description}
                    </span>
                  </span>
                  <span className="mt-auto text-sm font-semibold tabular-nums text-[#1C3A34]">
                    {amountLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">{payCopy.referenceHint}</p>
      </section>

      <Sheet open={activeMethod !== null} onOpenChange={(open) => !open && setActiveMethod(null)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-md"
        >
          {activeMethod ? (
            <>
              <SheetHeader className="shrink-0 border-b border-slate-200/80 px-6 py-5 text-left">
                <div className="flex flex-col gap-3">
                  <PaymentProviderLogo methodId={activeMethod} title={sheetTitle} size="sheet" />
                  <div className="space-y-1">
                    <SheetTitle className={adminHeadingClass}>{sheetTitle}</SheetTitle>
                    <SheetDescription className="text-sm leading-relaxed text-slate-500">
                      {sheetDescription}
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
                  disabled={confirming}
                  onClick={() => void handleConfirmPayment()}
                >
                  {confirming ? payCopy.confirmingPayment : payCopy.confirmPayment}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

function PaymentProviderLogo({
  methodId,
  title,
  size,
}: {
  methodId: CustomerPaymentMethodId;
  title: string;
  size: "card" | "sheet";
}) {
  const logo = PAYMENT_PROVIDER_LOGOS[methodId];

  return (
    <Image
      src={logo.src}
      alt={title}
      width={logo.width}
      height={logo.height}
      className={cn(
        "w-auto object-contain object-left",
        size === "card" ? "h-7 max-w-[7.5rem] sm:h-8" : "h-9 max-w-[9rem]",
      )}
    />
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
