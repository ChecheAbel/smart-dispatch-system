"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Download,
  FileCheck,
  FileText,
  HelpCircle,
  Mail,
  Printer,
  Receipt,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { Invoice, InvoiceStatus } from "@smart-dispatch/types";
import { useAuth, useLocale } from "@/components/shared/providers";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminBadgeGoldClass,
  adminBadgeSuccessClass,
  adminCardClass,
  adminEyebrowClass,
  adminHeadingClass,
  adminIconBoxClass,
  adminPrimaryButtonClass,
} from "@/lib/admin-theme";
import {
  fetchInvoiceById,
  issueInvoice,
  markInvoicePaid,
  voidInvoice,
} from "@/lib/invoice-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import {
  formatMessage,
  getAdminInvoicesMessages,
  getCustomerRequestsMessages,
} from "@/translations";
import { cn } from "@/lib/utils";
import { formatContractTermRange } from "@/app/dashboard/_components/ride-requests/ride-request-utils";
import {
  buildInvoiceTripDetailsLabels,
  InvoiceLineItemTripDetails,
} from "@/components/billing/invoice-line-item-trip-details";

const STATUS_BADGE_CLASS: Record<InvoiceStatus, string> = {
  draft:
    "border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300",
  issued: adminBadgeGoldClass,
  paid: adminBadgeSuccessClass,
  void:
    "border-red-200/90 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-300",
};

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  const dateOnly = value.includes("T") ? value.slice(0, 10) : value;
  const parsed = new Date(`${dateOnly}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "ETB",
    maximumFractionDigits: 2,
  }).format(amount);
}

function getInvoiceDetailUiStrings(isAm: boolean) {
  return {
    loading: isAm ? "የደረሰኝ ዝርዝር በመጫን ላይ..." : "Loading invoice details...",
    notFound: {
      title: isAm ? "ደረሰኝ አልተገኘም" : "Invoice Not Found",
      description: isAm
        ? "የተፈለገው ደረሰኝ አልተገኘም ወይም ተሰርዟል። እባክዎ ማጣቀሻውን ያረጋግጡ።"
        : "The requested invoice could not be found or may have been deleted. Please check the reference ID.",
      back: isAm ? "ወደ ደረሰኞች ተመለስ" : "Back to invoices",
    },
    actions: {
      print: isAm ? "አትም / ፒዲኤፍ" : "Print / PDF",
      issuing: isAm ? "በማውጣት ላይ..." : "Issuing...",
      markingPaid: isAm ? "በማስመዝገብ ላይ..." : "Recording...",
      voiding: isAm ? "በመሰረዝ ላይ..." : "Voiding...",
    },
    lifecycle: {
      title: isAm ? "የደረሰኝ ሂደት ደረጃ" : "Invoice Lifecycle Status",
      draft: {
        label: isAm ? "ረቂቅ ተዘጋጅቷል" : "Draft Created",
        desc: (date: string) => (isAm ? `${date} ተዘጋጅቷል` : `Created on ${date}`),
      },
      issued: {
        label: isAm ? "ወጥቷል / ተልኳል" : "Issued to Client",
        pending: isAm ? "ክፍያ በመጠባበቅ ላይ" : "Awaiting payment",
        desc: (date: string) => (isAm ? `በ${date} ወጥቷል` : `Issued on ${date}`),
        notYet: isAm ? "ገና አልወጣም" : "Not yet issued",
      },
      paid: {
        label: isAm ? "ተከፍሏል / ተጠናቋል" : "Paid & Settled",
        desc: (date: string) => (isAm ? `በ${date} ተከፍሏል` : `Settled on ${date}`),
        dueBy: (date: string) => (isAm ? `የመክፈያ ቀን፦ ${date}` : `Due by ${date}`),
        pending: isAm ? "ክፍያ አልተጠናቀቀም" : "Pending settlement",
      },
      voided: {
        label: isAm ? "ደረሰኙ ተሰርዟል" : "Invoice Voided",
        desc: isAm
          ? "ይህ ደረሰኝ ተሰርዟል፤ ክፍያ አይጠየቅበትም።"
          : "This invoice has been voided and is no longer payable.",
      },
    },
    financialHero: {
      totalDue: isAm ? "የሚከፈል ጠቅላላ ሂሳብ" : "Total Amount Due",
      totalPaid: isAm ? "የተከፈለ ጠቅላላ ሂሳብ" : "Total Settled Amount",
      totalVoid: isAm ? "የተሰረዘ ጠቅላላ መጠን" : "Voided Invoice Total",
      subtotalLabel: isAm ? "ንዑስ ድምር" : "Subtotal",
      vatLabel: (rate: number) => (isAm ? `ተ.እ.ታ (${rate}%)` : `VAT (${rate}%)`),
      penaltyLabel: isAm ? "የዘገየ ክፍያ ቅጣት" : "Late Penalty",
      dueBadge: (date: string) => (isAm ? `የመክፈያ ቀን፦ ${date}` : `Due date: ${date}`),
      paidBadge: (date: string) => (isAm ? `በ${date} ተከፍሏል` : `Paid on ${date}`),
    },
    sections: {
      clientAndContract: {
        title: isAm ? "የደንበኛ እና የውል ዝርዝሮች" : "Customer & Contract Details",
        description: isAm
          ? "ደረሰኙ የተዘጋጀለት ደንበኛ፣ የውል ማጣቀሻ እና የጊዜ ወሰን።"
          : "Billed organization, contract reference, and billing schedule.",
      },
      settlementAndTimeline: {
        title: isAm ? "የክፍያ የጊዜ ሰሌዳ እና ማጠናቀቂያ" : "Settlement & Timeline",
        description: isAm
          ? "የደረሰኝ የወጣበት፣ የመክፈያ እና የክፍያ ማረጋገጫ ቀናት።"
          : "Issuance schedule, due date limits, and recorded payment details.",
      },
      lineItems: {
        title: isAm ? "የተካተቱ ጉዞዎች እና ዝርዝር ሂሳብ" : "Itemized Trips & Billable Rides",
        description: isAm
          ? "በዚህ የሂሳብ ክፍለ-ጊዜ ውስጥ የተከናወኑ የተሟሉ ጉዞዎች ዝርዝር።"
          : "Completed trips and rides audited for this billing period.",
        tripCount: (count: number) =>
          isAm ? `${count} ጉዞዎች` : `${count} ${count === 1 ? "trip" : "trips"}`,
        tripIndex: (index: number) => (isAm ? `ጉዞ #${index}` : `Trip #${index}`),
      },
      statementSummary: {
        title: isAm ? "የደረሰኝ ማጠቃለያ ስሌት" : "Commercial Statement Summary",
        baseSubtotal: isAm ? "የጉዞዎች ንዑስ ድምር" : "Trips Base Subtotal",
        vatAmount: (rate: number) =>
          isAm ? `ተጨማሪ እሴት ታክስ (ተ.እ.ታ ${rate}%)` : `Value Added Tax (VAT ${rate}%)`,
        latePenaltyFee: isAm ? "የዘገየ ክፍያ ቅጣት ጭማሪ" : "Late Payment Surcharge",
        finalBalance: isAm ? "የመጨረሻ ጠቅላላ ተከፋይ" : "Total Balance Payable",
        paidInFull: isAm ? "ሙሉ በሙሉ ተከፍሏል" : "Paid in Full",
      },
    },
    overdueWarning: isAm
      ? "ማስጠንቀቂያ፦ ይህ ደረሰኝ የመክፈያ ጊዜው አልፏል። የዘገየ ክፍያ ቅጣት ሊተገበር ይችላል።"
      : "Notice: This invoice is past its due date. Late payment penalties may apply.",
    printWatermark: isAm ? "ኦፊሴላዊ የክፍያ ደረሰኝ" : "Official Invoice Statement",
  };
}

export function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminInvoicesMessages(locale);
  const canRead = hasPermission(PERMISSIONS.invoices.read);
  const canWrite = hasPermission(PERMISSIONS.invoices.write);
  const canDelete = hasPermission(PERMISSIONS.invoices.delete);

  const isAm = locale === "am";
  const ui = useMemo(() => getInvoiceDetailUiStrings(isAm), [isAm]);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState<"issue" | "markPaid" | "void" | null>(
    null,
  );

  useEffect(() => {
    if (!canRead || !params.id) return;

    let cancelled = false;

    async function loadInvoice() {
      setLoading(true);
      try {
        const result = await fetchInvoiceById(params.id, locale);
        if (!cancelled) setInvoice(result.invoice);
      } catch {
        if (!cancelled) {
          showErrorToast({
            title: copy.toast.loadFailed.title,
            description: copy.toast.loadFailed.description,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [canRead, copy.toast.loadFailed, locale, params.id, refreshKey]);

  async function handleIssue() {
    if (!invoice) return;
    setActionLoading("issue");
    try {
      const updated = await issueInvoice(invoice.id);
      setInvoice(updated);
      showSuccessToast({
        title: copy.toast.issueSuccess.title,
        description: formatMessage(copy.toast.issueSuccess.description, {
          reference: updated.reference_number,
        }),
      });
    } catch {
      showErrorToast({
        title: copy.toast.actionFailed.title,
        description: copy.toast.actionFailed.description,
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return;
    setActionLoading("markPaid");
    try {
      const updated = await markInvoicePaid(invoice.id);
      setInvoice(updated);
      showSuccessToast({
        title: copy.toast.markPaidSuccess.title,
        description: formatMessage(copy.toast.markPaidSuccess.description, {
          reference: updated.reference_number,
        }),
      });
    } catch {
      showErrorToast({
        title: copy.toast.actionFailed.title,
        description: copy.toast.actionFailed.description,
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleVoid() {
    if (!invoice) return;
    setActionLoading("void");
    try {
      const updated = await voidInvoice(invoice.id);
      setInvoice(updated);
      showSuccessToast({
        title: copy.toast.voidSuccess.title,
        description: formatMessage(copy.toast.voidSuccess.description, {
          reference: updated.reference_number,
        }),
      });
    } catch {
      showErrorToast({
        title: copy.toast.actionFailed.title,
        description: copy.toast.actionFailed.description,
      });
    } finally {
      setActionLoading(null);
    }
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  if (loading) {
    return <InvoiceDetailSkeleton loadingText={ui.loading} />;
  }

  if (!invoice) {
    return <InvoiceNotFoundCard ui={ui} />;
  }

  const requestCopy = getCustomerRequestsMessages(locale as "en" | "am");
  const tripDetailLabels = buildInvoiceTripDetailsLabels(copy.detail, requestCopy.status);

  const displayTotal =
    invoice.status === "issued" && invoice.penalty_amount > 0
      ? invoice.amount_due
      : invoice.total_amount;

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="space-y-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-muted-foreground dark:hover:text-foreground"
            render={<Link href="/admin/billing/invoices" />}
            nativeButton={false}
          >
            <ArrowLeft className="size-3.5 mr-1" />
            {copy.detail.back}
          </Button>

          <div>
            <p className={cn(adminEyebrowClass, "text-xs")}>{copy.eyebrow}</p>
            <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
              <h1 className={cn(adminHeadingClass, "text-2xl font-black tracking-tight")}>
                {invoice.reference_number}
              </h1>
              <Badge className={cn("px-2.5 py-0.5 text-xs font-bold capitalize", STATUS_BADGE_CLASS[invoice.status])}>
                {copy.status[invoice.status]}
              </Badge>
              {invoice.is_overdue && invoice.status !== "paid" && invoice.status !== "void" ? (
                <Badge className="border-amber-200/90 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-300">
                  <AlertTriangle className="size-3 mr-1" />
                  {copy.detail.overdue}
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-muted-foreground">
              <span className="font-semibold text-slate-800 dark:text-foreground">
                {invoice.contract.title}
              </span>{" "}
              · {invoice.requester.name}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {/* Print / Export Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-9 px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-border dark:text-foreground dark:hover:bg-muted"
          >
            <Printer className="size-3.5 mr-1.5 text-slate-500" />
            {ui.actions.print}
          </Button>

          {canWrite && invoice.status === "draft" ? (
            <Button
              type="button"
              size="sm"
              disabled={Boolean(actionLoading)}
              className={cn(adminPrimaryButtonClass, "h-9 min-w-[100px] text-xs font-semibold shadow-sm")}
              onClick={handleIssue}
            >
              {actionLoading === "issue" ? (
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black dark:border-t-transparent" />
                  {ui.actions.issuing}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="size-3.5" />
                  {copy.actions.issue}
                </span>
              )}
            </Button>
          ) : null}

          {canWrite && invoice.status === "issued" ? (
            <Button
              type="button"
              size="sm"
              disabled={Boolean(actionLoading)}
              className={cn(
                "h-9 min-w-[120px] rounded-lg bg-emerald-700 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500",
              )}
              onClick={handleMarkPaid}
            >
              {actionLoading === "markPaid" ? (
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {ui.actions.markingPaid}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  {copy.actions.markPaid}
                </span>
              )}
            </Button>
          ) : null}

          {canDelete && invoice.status !== "paid" && invoice.status !== "void" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={Boolean(actionLoading)}
              className="h-9 px-3 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
              onClick={handleVoid}
            >
              {actionLoading === "void" ? (
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                  {ui.actions.voiding}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Ban className="size-3.5" />
                  {copy.actions.void}
                </span>
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Print Document Header (Visible only when printed) */}
      <div className="hidden print:flex items-center justify-between border-b pb-4 border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{invoice.reference_number}</h1>
          <p className="text-xs text-slate-500">{ui.printWatermark}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-700 uppercase">{copy.status[invoice.status]}</p>
          <p className="text-[11px] text-slate-500">{formatDate(invoice.issued_at || invoice.created_at, locale)}</p>
        </div>
      </div>

      {/* Overdue Warning Banner */}
      {invoice.is_overdue && invoice.status !== "paid" && invoice.status !== "void" ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-sm dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="font-medium leading-relaxed">{ui.overdueWarning}</p>
        </div>
      ) : null}

      {/* INVOICE LIFECYCLE PROGRESSION TIMELINE */}
      <Card className={cn(adminCardClass, "overflow-hidden rounded-xl border border-slate-200/90 p-4 shadow-sm dark:border-border")}>
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-border/60">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-muted-foreground">
            {ui.lifecycle.title}
          </p>
          <span className="font-mono text-xs font-bold uppercase text-[var(--brand-primary)] dark:text-[var(--brand-accent)]">
            {invoice.currency || "ETB"}
          </span>
        </div>

        {invoice.status === "void" ? (
          <div className="mt-3.5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50/60 p-3.5 text-xs text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            <Ban className="size-4 text-red-600 dark:text-red-400" />
            <div className="space-y-0.5">
              <p className="font-bold">{ui.lifecycle.voided.label}</p>
              <p className="text-[11px] text-red-700/90 dark:text-red-300/90">{ui.lifecycle.voided.desc}</p>
            </div>
          </div>
        ) : (
          <div className="mt-3.5 grid gap-3 sm:grid-cols-3">
            {/* Step 1: Draft */}
            <div
              className={cn(
                "relative rounded-lg border p-3 transition-all",
                "border-slate-200/90 bg-white dark:border-border dark:bg-card",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-foreground">
                  <div className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-muted dark:text-muted-foreground">
                    <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>{ui.lifecycle.draft.label}</span>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-muted-foreground">
                {ui.lifecycle.draft.desc(formatDate(invoice.created_at, locale))}
              </p>
            </div>

            {/* Step 2: Issued */}
            <div
              className={cn(
                "relative rounded-lg border p-3 transition-all",
                invoice.status === "issued" || invoice.status === "paid"
                  ? "border-amber-200/90 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-950/20"
                  : "border-slate-200/60 bg-slate-50/50 opacity-70 dark:border-border/60 dark:bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-foreground">
                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full",
                      invoice.status === "issued" || invoice.status === "paid"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                        : "bg-slate-100 text-slate-400 dark:bg-muted dark:text-muted-foreground",
                    )}
                  >
                    {invoice.status === "paid" ? (
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                    ) : invoice.status === "issued" ? (
                      <Clock className="size-3 text-amber-700 dark:text-amber-300" />
                    ) : (
                      <span className="text-[10px] font-bold">2</span>
                    )}
                  </div>
                  <span>{ui.lifecycle.issued.label}</span>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-muted-foreground">
                {invoice.issued_at
                  ? ui.lifecycle.issued.desc(formatDate(invoice.issued_at, locale))
                  : ui.lifecycle.issued.notYet}
              </p>
            </div>

            {/* Step 3: Paid */}
            <div
              className={cn(
                "relative rounded-lg border p-3 transition-all",
                invoice.status === "paid"
                  ? "border-emerald-200/90 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                  : "border-slate-200/60 bg-slate-50/50 opacity-70 dark:border-border/60 dark:bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-foreground">
                  <div
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full",
                      invoice.status === "paid"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-400 dark:bg-muted dark:text-muted-foreground",
                    )}
                  >
                    {invoice.status === "paid" ? (
                      <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <span className="text-[10px] font-bold">3</span>
                    )}
                  </div>
                  <span>{ui.lifecycle.paid.label}</span>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-muted-foreground">
                {invoice.status === "paid" && invoice.paid_at
                  ? ui.lifecycle.paid.desc(formatDate(invoice.paid_at, locale))
                  : invoice.due_at
                    ? ui.lifecycle.paid.dueBy(formatDate(invoice.due_at, locale))
                    : ui.lifecycle.paid.pending}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* FINANCIAL OVERVIEW HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-[#1C3A34] via-[#152e29] to-[#0f231f] p-6 text-white shadow-md dark:border-border">
        {/* Accent background glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-emerald-200/90 uppercase">
              <Coins className="size-3.5" />
              {invoice.status === "paid"
                ? ui.financialHero.totalPaid
                : invoice.status === "void"
                  ? ui.financialHero.totalVoid
                  : ui.financialHero.totalDue}
            </span>

            <div className="flex items-baseline gap-2.5">
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
                {formatMoney(displayTotal, invoice.currency, locale)}
              </h2>
              <span className="text-sm font-bold uppercase tracking-wider text-emerald-300/80">
                {invoice.currency}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-emerald-100/70">
              {invoice.payment_terms_days ? (
                <span className="rounded bg-white/10 px-2 py-0.5 font-medium backdrop-blur-sm">
                  {formatMessage(copy.detail.paymentTermsValue, {
                    days: invoice.payment_terms_days,
                  })}
                </span>
              ) : null}

              {invoice.status === "paid" && invoice.paid_at ? (
                <span className="text-emerald-300 font-medium">
                  {ui.financialHero.paidBadge(formatDate(invoice.paid_at, locale))}
                </span>
              ) : invoice.due_at ? (
                <span className={cn("font-medium", invoice.is_overdue ? "text-amber-300" : "text-emerald-200/80")}>
                  {ui.financialHero.dueBadge(formatDate(invoice.due_at, locale))}
                </span>
              ) : null}
            </div>
          </div>

          {/* Quick Metrics Breakdown Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
              <p className="text-[11px] font-medium text-emerald-200/80 uppercase tracking-wider">
                {ui.financialHero.subtotalLabel}
              </p>
              <p className="mt-1 text-sm font-bold text-white tabular-nums">
                {formatMoney(invoice.subtotal, invoice.currency, locale)}
              </p>
            </div>

            {invoice.vat_rate > 0 ? (
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur-sm border border-white/10">
                <p className="text-[11px] font-medium text-emerald-200/80 uppercase tracking-wider">
                  {ui.financialHero.vatLabel(invoice.vat_rate)}
                </p>
                <p className="mt-1 text-sm font-bold text-white tabular-nums">
                  {formatMoney(invoice.vat_amount, invoice.currency, locale)}
                </p>
              </div>
            ) : null}

            {invoice.penalty_amount > 0 ? (
              <div className="rounded-xl bg-amber-500/20 p-3 backdrop-blur-sm border border-amber-400/30">
                <p className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">
                  {ui.financialHero.penaltyLabel}
                </p>
                <p className="mt-1 text-sm font-bold text-amber-100 tabular-nums">
                  +{formatMoney(invoice.penalty_amount, invoice.currency, locale)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* TWO COLUMN SUMMARY DETAILS (CLIENT & SETTLEMENT) */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* CARD 1: Customer & Contract Scope */}
        <Card className={cn(adminCardClass, "group overflow-hidden rounded-2xl border border-slate-200/90 py-0 shadow-sm transition-all dark:border-border")}>
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 dark:border-border/60 dark:bg-muted/20">
            <div className={cn(adminIconBoxClass, "size-8 shrink-0 p-0 flex items-center justify-center rounded-lg")}>
              <UserRound className="size-4 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
            </div>
            <div>
              <h2 className={cn("text-sm font-semibold tracking-tight", adminHeadingClass)}>
                {ui.sections.clientAndContract.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                {ui.sections.clientAndContract.description}
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <DetailItem
              icon={UserRound}
              label={copy.detail.customer}
              value={invoice.requester.name}
              hint={invoice.requester.email}
            />

            <DetailItem
              icon={FileText}
              label={copy.detail.contract}
              value={invoice.contract.reference_number}
              hint={invoice.contract.title}
            />

            <DetailItem
              icon={Calendar}
              label={copy.detail.period}
              value={formatContractTermRange(
                { starts_at: invoice.period_start, ends_at: invoice.period_end },
                locale,
              )}
            />

            <DetailItem
              icon={Clock}
              label={copy.detail.paymentTerms}
              value={
                invoice.payment_terms_days
                  ? formatMessage(copy.detail.paymentTermsValue, {
                      days: invoice.payment_terms_days,
                    })
                  : "—"
              }
            />
          </div>
        </Card>

        {/* CARD 2: Settlement Timeline & Payment Method */}
        <Card className={cn(adminCardClass, "group overflow-hidden rounded-2xl border border-slate-200/90 py-0 shadow-sm transition-all dark:border-border")}>
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 dark:border-border/60 dark:bg-muted/20">
            <div className={cn(adminIconBoxClass, "size-8 shrink-0 p-0 flex items-center justify-center rounded-lg")}>
              <CalendarClock className="size-4 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
            </div>
            <div>
              <h2 className={cn("text-sm font-semibold tracking-tight", adminHeadingClass)}>
                {ui.sections.settlementAndTimeline.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                {ui.sections.settlementAndTimeline.description}
              </p>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <DetailItem
              icon={Calendar}
              label={copy.detail.issuedAt}
              value={formatDate(invoice.issued_at, locale)}
            />

            <DetailItem
              icon={CalendarClock}
              label={copy.detail.dueAt}
              value={formatDate(invoice.due_at, locale)}
              alert={invoice.is_overdue && invoice.status !== "paid" && invoice.status !== "void"}
            />

            <DetailItem
              icon={CheckCircle2}
              label={copy.detail.paidAt}
              value={formatDate(invoice.paid_at, locale)}
            />

            <DetailItem
              icon={CreditCard}
              label={copy.detail.paymentMethod}
              value={
                invoice.payment_method
                  ? (copy.detail.paymentMethods as Record<string, string>)[
                      invoice.payment_method
                    ] ?? invoice.payment_method
                  : copy.detail.paymentMethods.notRecorded
              }
            />
          </div>
        </Card>
      </div>

      {/* ITEMIZED TRIPS AND BILLABLE RIDES */}
      <Card className={cn(adminCardClass, "overflow-hidden rounded-2xl border border-slate-200/90 py-0 shadow-sm dark:border-border")}>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-border/60 dark:bg-muted/20">
          <div className="flex items-center gap-3">
            <div className={cn(adminIconBoxClass, "size-8 shrink-0 p-0 flex items-center justify-center rounded-lg")}>
              <Receipt className="size-4 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]" />
            </div>
            <div>
              <h2 className={cn("text-sm font-semibold tracking-tight", adminHeadingClass)}>
                {ui.sections.lineItems.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-muted-foreground">
                {ui.sections.lineItems.description}
              </p>
            </div>
          </div>

          <Badge variant="outline" className="border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700 shadow-none dark:border-border dark:bg-card dark:text-foreground">
            {ui.sections.lineItems.tripCount(invoice.line_items.length)}
          </Badge>
        </div>

        {invoice.line_items.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-slate-500 dark:text-muted-foreground">
            <p>{copy.detail.noLineItems}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-border/60">
            {invoice.line_items.map((item, index) => (
              <div key={item.id} className="space-y-4 px-5 py-5 transition-colors hover:bg-slate-50/40 dark:hover:bg-muted/10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-muted dark:text-muted-foreground">
                      {ui.sections.lineItems.tripIndex(index + 1)}
                    </span>
                    <p className="mt-1 text-sm font-bold text-slate-900 dark:text-foreground">
                      {item.description}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-extrabold tabular-nums text-slate-900 dark:text-foreground">
                      {formatMoney(item.line_total, invoice.currency, locale)}
                    </p>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">
                      {invoice.currency}
                    </span>
                  </div>
                </div>

                <InvoiceLineItemTripDetails
                  item={item}
                  locale={locale}
                  labels={tripDetailLabels}
                  showBillingMetrics
                />
              </div>
            ))}
          </div>
        )}

        {/* Commercial Statement Summary Footer Block */}
        <div className="border-t border-slate-200/90 bg-slate-50/80 p-5 dark:border-border dark:bg-muted/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-foreground">
                {ui.sections.statementSummary.title}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-muted-foreground">
                {invoice.contract.title} · {invoice.reference_number}
              </p>
            </div>

            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-muted-foreground">
                <span>{ui.sections.statementSummary.baseSubtotal}</span>
                <span className="font-semibold tabular-nums text-slate-800 dark:text-foreground">
                  {formatMoney(invoice.subtotal, invoice.currency, locale)}
                </span>
              </div>

              {invoice.vat_rate > 0 ? (
                <div className="flex justify-between text-slate-600 dark:text-muted-foreground">
                  <span>{ui.sections.statementSummary.vatAmount(invoice.vat_rate)}</span>
                  <span className="font-semibold tabular-nums text-slate-800 dark:text-foreground">
                    {formatMoney(invoice.vat_amount, invoice.currency, locale)}
                  </span>
                </div>
              ) : null}

              {invoice.penalty_amount > 0 ? (
                <div className="flex justify-between text-amber-700 dark:text-amber-400">
                  <span className="font-medium">{ui.sections.statementSummary.latePenaltyFee}</span>
                  <span className="font-bold tabular-nums">
                    +{formatMoney(invoice.penalty_amount, invoice.currency, locale)}
                  </span>
                </div>
              ) : null}

              <div className="border-t border-slate-200/80 pt-2 flex justify-between items-baseline text-sm font-bold text-slate-900 dark:border-border dark:text-foreground">
                <span>{ui.sections.statementSummary.finalBalance}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-[var(--brand-primary)] dark:text-[var(--brand-accent)] tabular-nums">
                    {formatMoney(displayTotal, invoice.currency, locale)}
                  </span>
                </div>
              </div>

              {invoice.status === "paid" ? (
                <div className="flex items-center justify-end gap-1.5 pt-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>{ui.sections.statementSummary.paidInFull}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
  hint,
  alert,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  hint?: string | null;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        alert
          ? "border-amber-200 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20"
          : "border-slate-100 bg-white dark:border-border/60 dark:bg-card",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider dark:text-muted-foreground">
        <Icon className={cn("size-3.5", alert ? "text-amber-600 dark:text-amber-400" : "text-slate-400")} />
        <span>{label}</span>
      </div>
      <p
        className={cn(
          "mt-1 text-xs font-bold truncate",
          alert ? "text-amber-900 dark:text-amber-300" : "text-slate-900 dark:text-foreground",
        )}
      >
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function InvoiceDetailSkeleton({ loadingText }: { loadingText: string }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-28" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Loading banner */}
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-xs font-medium text-slate-500 shadow-sm dark:border-border dark:bg-card dark:text-muted-foreground">
        <div className="size-4 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent dark:border-[var(--brand-accent)] dark:border-t-transparent" />
        {loadingText}
      </div>

      <Skeleton className="h-28 w-full rounded-2xl" />

      <div className="grid gap-5 md:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>

      <Skeleton className="h-60 w-full rounded-2xl" />
    </div>
  );
}

function InvoiceNotFoundCard({
  ui,
}: {
  ui: ReturnType<typeof getInvoiceDetailUiStrings>;
}) {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200/90 shadow-sm dark:border-border">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-500/30">
        <Receipt className="size-6" />
      </div>
      <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-foreground">
        {ui.notFound.title}
      </h2>
      <p className="mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed dark:text-muted-foreground">
        {ui.notFound.description}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-5 text-xs font-medium"
        render={<Link href="/admin/billing/invoices" />}
        nativeButton={false}
      >
        <ArrowLeft className="size-3.5 mr-1.5" />
        {ui.notFound.back}
      </Button>
    </Card>
  );
}
