"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Copy } from "lucide-react";
import type {
  CustomerInvoice,
  CustomerPaymentMethodId,
  CustomerPaymentOptions,
  InvoiceLineItem,
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
  adminEyebrowClass,
  adminHeadingClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  confirmCustomerInvoicesPayment,
  fetchCustomerPaymentOptions,
} from "@/lib/customer-billing-api";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { formatMessage, getCustomerInvoicesMessages } from "@/translations";
import type { SupportedLocale } from "@/lib/locale";
import { formatGlobalDate } from "@/lib/ethiopian-calendar";
import { cn } from "@/lib/utils";

const PAYMENT_PROVIDER_LOGOS: Record<
  CustomerPaymentMethodId,
  { src: string; width: number; height: number }
> = {
  telebirr: { src: "/providers/telebirr.webp", width: 140, height: 48 },
  cbe_birr: { src: "/providers/cbe-birr.webp", width: 140, height: 48 },
};

type BulkInvoicePaymentSheetProps = {
  invoices: CustomerInvoice[];
  open: boolean;
  locale: SupportedLocale;
  onOpenChange: (open: boolean) => void;
  onPaid?: (invoices: CustomerInvoice[]) => void;
};

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getTripSummary(item: InvoiceLineItem) {
  return {
    pickup: item.ride_request.pickup_address || item.description,
    dropoff: item.ride_request.dropoff_address || null,
    completedAt: item.ride_request.completed_at,
    amount: item.line_total,
  };
}

export function BulkInvoicePaymentSheet({
  invoices,
  open,
  locale,
  onOpenChange,
  onPaid,
}: BulkInvoicePaymentSheetProps) {
  const copy = getCustomerInvoicesMessages(locale);
  const payCopy = copy.detail.payment;
  const bulkCopy = copy.bulkPay;
  const [options, setOptions] = useState<CustomerPaymentOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [activeMethod, setActiveMethod] = useState<CustomerPaymentMethodId | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);

  const totalAmount = useMemo(
    () => invoices.reduce((sum, invoice) => sum + invoice.total_amount, 0),
    [invoices],
  );
  const currency = invoices[0]?.currency ?? "ETB";
  const amountLabel = formatMoney(totalAmount, currency, locale);
  const referenceList = invoices.map((invoice) => invoice.reference_number).join(", ");

  useEffect(() => {
    if (!open) {
      setActiveMethod(null);
      setCopiedField(null);
      setExpandedInvoiceId(null);
      return;
    }

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
  }, [open]);

  useEffect(() => {
    setExpandedInvoiceId((current) =>
      current && invoices.some((invoice) => invoice.id === current) ? current : null,
    );
  }, [invoices]);

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
    if (!activeMethod || confirming || invoices.length === 0) return;

    setConfirming(true);
    try {
      const result = await confirmCustomerInvoicesPayment({
        invoice_ids: invoices.map((invoice) => invoice.id),
        payment_method: activeMethod,
        locale,
      });
      onOpenChange(false);
      onPaid?.(result.invoices);
      showSuccessToast({
        title: formatMessage(bulkCopy.paymentConfirmed, { count: result.invoices.length }),
      });
    } catch {
      showErrorToast({ title: bulkCopy.paymentConfirmFailed });
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
  const telebirr = options?.telebirr;
  const cbe = options?.cbe_birr;

  const sheetTitle =
    activeMethod === "telebirr"
      ? payCopy.telebirrTitle
      : activeMethod === "cbe_birr"
        ? payCopy.cbeTitle
        : bulkCopy.sheetTitle;

  const sheetDescription =
    activeMethod === "telebirr"
      ? payCopy.telebirrSheetDescription
      : activeMethod === "cbe_birr"
        ? payCopy.cbeSheetDescription
        : formatMessage(bulkCopy.sheetDescription, { count: invoices.length });

  const steps =
    activeMethod === "telebirr"
      ? payCopy.telebirrSteps.map((step) =>
          formatMessage(step, {
            amount: amountLabel,
            reference: referenceList,
            short_code: telebirr?.short_code ?? payCopy.merchantCodePending,
          }),
        )
      : activeMethod === "cbe_birr"
        ? payCopy.cbeSteps.map((step) =>
            formatMessage(step, {
              amount: amountLabel,
              reference: referenceList,
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-slate-200/80 px-6 py-5 text-left">
          <div className="flex flex-col gap-3">
            {activeMethod ? (
              <PaymentProviderLogo methodId={activeMethod} title={sheetTitle} />
            ) : null}
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
              <p className="mt-1 text-sm text-slate-500">
                {formatMessage(bulkCopy.selectedCount, { count: invoices.length })}
              </p>
            </div>

            <div className="space-y-2">
              <p className={adminEyebrowClass}>{bulkCopy.invoicesLabel}</p>
              <ul className="space-y-2">
                {invoices.map((invoice) => {
                  const tripCount = invoice.line_item_count || invoice.line_items.length;
                  const expanded = expandedInvoiceId === invoice.id;
                  const trips = invoice.line_items.map(getTripSummary);

                  return (
                    <li
                      key={invoice.id}
                      className="overflow-hidden rounded-lg border border-slate-200/80"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedInvoiceId((current) =>
                            current === invoice.id ? null : invoice.id,
                          )
                        }
                        aria-expanded={expanded}
                        className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#1C3A34]">
                            {invoice.reference_number}
                          </p>
                          <p className="truncate text-xs text-slate-500">{invoice.contract.title}</p>
                          <p className="mt-1 text-[11px] font-medium text-slate-500">
                            {formatMessage(bulkCopy.tripsCount, { count: tripCount })}
                            <span className="mx-1.5 text-slate-300">·</span>
                            {expanded ? bulkCopy.hideTrips : bulkCopy.showTrips}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-start gap-2">
                          <p className="text-sm font-semibold tabular-nums text-slate-700">
                            {formatMoney(invoice.total_amount, invoice.currency, locale)}
                          </p>
                          <ChevronDown
                            className={cn(
                              "mt-0.5 size-4 text-slate-400 transition-transform",
                              expanded && "rotate-180",
                            )}
                          />
                        </div>
                      </button>

                      {expanded ? (
                        <div className="space-y-2 border-t border-slate-100 bg-slate-50/80 px-3 py-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                            {bulkCopy.tripsTitle}
                          </p>
                          {trips.length === 0 ? (
                            <p className="text-xs leading-relaxed text-slate-500">{bulkCopy.noTrips}</p>
                          ) : (
                            <ul className="space-y-2">
                              {trips.map((trip, index) => {
                                const completedRaw = trip.completedAt
                                  ? formatGlobalDate(trip.completedAt, locale)
                                  : null;
                                const completedLabel =
                                  completedRaw && completedRaw !== "—" ? completedRaw : null;
                                const routeLabel = trip.dropoff
                                  ? formatMessage(bulkCopy.tripRoute, {
                                      pickup: trip.pickup,
                                      dropoff: trip.dropoff,
                                    })
                                  : trip.pickup;

                                return (
                                  <li
                                    key={`${invoice.id}-${index}`}
                                    className="rounded-md border border-slate-200/70 bg-white px-2.5 py-2"
                                  >
                                    <p className="text-xs leading-relaxed font-medium text-slate-700">
                                      {routeLabel}
                                    </p>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                                      {completedLabel ? (
                                        <span>
                                          {copy.detail.lineItemCompleted}: {completedLabel}
                                        </span>
                                      ) : null}
                                      <span className="font-semibold tabular-nums text-slate-600">
                                        {formatMoney(trip.amount, invoice.currency, locale)}
                                      </span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {!activeMethod ? (
            loading ? (
              <p className="text-sm text-slate-500">{payCopy.loading}</p>
            ) : visibleMethods.length === 0 ? (
              <p className="text-sm text-amber-800">{payCopy.configPendingNotice}</p>
            ) : (
              <div className="space-y-3">
                <p className={adminEyebrowClass}>{bulkCopy.chooseMethod}</p>
                <div className={cn("grid gap-3", visibleMethods.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                  {visibleMethods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setActiveMethod(method.id)}
                      className="flex min-h-[7.5rem] flex-col items-start gap-2 rounded-lg border border-slate-200/80 p-3 text-left transition-colors hover:border-[#C9B87A]/40 hover:bg-[#C9B87A]/5"
                    >
                      <PaymentProviderLogo methodId={method.id} title={method.title} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[#1C3A34]">{method.title}</span>
                        <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-slate-500">
                          {method.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <>
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

              <CopyLine
                label={bulkCopy.referencesLabel}
                value={referenceList}
                fieldKey="references"
                copiedField={copiedField}
                onCopy={copyValue}
                mono
              />

              <p className="text-xs leading-relaxed text-slate-500">{bulkCopy.referenceHint}</p>
            </>
          )}
        </div>

        {activeMethod ? (
          <SheetFooter className="shrink-0 gap-2 border-t border-slate-200/80 px-6 py-4 sm:flex-col">
            <Button
              type="button"
              className={cn(adminPrimaryButtonClass, "w-full")}
              disabled={confirming}
              onClick={() => void handleConfirmPayment()}
            >
              {confirming ? payCopy.confirmingPayment : bulkCopy.confirmPayment}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={confirming}
              onClick={() => setActiveMethod(null)}
            >
              {bulkCopy.backToMethods}
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function PaymentProviderLogo({
  methodId,
  title,
}: {
  methodId: CustomerPaymentMethodId;
  title: string;
}) {
  const logo = PAYMENT_PROVIDER_LOGOS[methodId];

  return (
    <Image
      src={logo.src}
      alt={title}
      width={logo.width}
      height={logo.height}
      className="h-8 w-auto max-w-[8rem] object-contain object-left"
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
