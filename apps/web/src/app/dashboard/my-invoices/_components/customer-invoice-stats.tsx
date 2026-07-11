"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CircleDollarSign, Receipt, Wallet } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { fetchMyInvoiceCount, fetchMyInvoices } from "@/lib/customer-billing-api";
import { getCustomerInvoicesMessages } from "@/translations";
import type { SupportedLocale } from "@/lib/locale";

type CustomerInvoiceStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
};

const INITIAL_STATS = { total: 0, outstanding: 0, paid: 0, overdue: 0 };

export function CustomerInvoiceStats({ locale, refreshKey }: CustomerInvoiceStatsProps) {
  const copy = getCustomerInvoicesMessages(locale);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const [total, outstanding, paid, issuedPage] = await Promise.all([
          fetchMyInvoiceCount(),
          fetchMyInvoiceCount({ status: "issued" }),
          fetchMyInvoiceCount({ status: "paid" }),
          fetchMyInvoices({ status: "issued", page: 1, limit: 100 }),
        ]);

        const now = Date.now();
        const overdue = issuedPage.data.filter((invoice) => {
          if (!invoice.due_at) return false;
          return new Date(invoice.due_at).getTime() < now;
        }).length;

        if (!cancelled) {
          setStats({ total, outstanding, paid, overdue });
        }
      } catch {
        if (!cancelled) {
          setStats(INITIAL_STATS);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [locale, refreshKey]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={copy.stats.totalTitle}
        value={stats.total}
        description={copy.stats.totalDescription}
        icon={Receipt}
        loading={loading}
      />
      <StatCard
        title={copy.stats.outstandingTitle}
        value={stats.outstanding}
        description={copy.stats.outstandingDescription}
        icon={CircleDollarSign}
        loading={loading}
      />
      <StatCard
        title={copy.stats.paidTitle}
        value={stats.paid}
        description={copy.stats.paidDescription}
        icon={Wallet}
        loading={loading}
      />
      <StatCard
        title={copy.stats.overdueTitle}
        value={stats.overdue}
        description={copy.stats.overdueDescription}
        icon={AlertCircle}
        loading={loading}
      />
    </div>
  );
}
