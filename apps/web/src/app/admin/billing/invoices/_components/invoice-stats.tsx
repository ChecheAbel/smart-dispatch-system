"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, FileClock, Receipt, Wallet } from "lucide-react";
import type { InvoiceStatus } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import { getAdminInvoicesMessages } from "@/translations";
import { fetchInvoiceCount } from "@/lib/invoice-api";
import type { SupportedLocale } from "@/lib/locale";

type InvoiceStatsProps = {
  locale: SupportedLocale;
  refreshKey: number;
  selectedStatus?: InvoiceStatus | "";
  onSelectStatus?: (status: InvoiceStatus | "") => void;
};

const INITIAL_STATS = { total: 0, draft: 0, issued: 0, paid: 0 };

export function InvoiceStats({
  locale,
  refreshKey,
  selectedStatus,
  onSelectStatus,
}: InvoiceStatsProps) {
  const copy = getAdminInvoicesMessages(locale);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      try {
        const [total, draft, issued, paid] = await Promise.all([
          fetchInvoiceCount(),
          fetchInvoiceCount({ status: "draft" }),
          fetchInvoiceCount({ status: "issued" }),
          fetchInvoiceCount({ status: "paid" }),
        ]);

        if (!cancelled) {
          setStats({ total, draft, issued, paid });
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
        active={selectedStatus === ""}
        onClick={onSelectStatus ? () => onSelectStatus("") : undefined}
      />
      <StatCard
        title={copy.stats.draftTitle}
        value={stats.draft}
        description={copy.stats.draftDescription}
        icon={FileClock}
        loading={loading}
        active={selectedStatus === "draft"}
        onClick={onSelectStatus ? () => onSelectStatus("draft") : undefined}
      />
      <StatCard
        title={copy.stats.issuedTitle}
        value={stats.issued}
        description={copy.stats.issuedDescription}
        icon={CircleDollarSign}
        loading={loading}
        active={selectedStatus === "issued"}
        onClick={onSelectStatus ? () => onSelectStatus("issued") : undefined}
      />
      <StatCard
        title={copy.stats.paidTitle}
        value={stats.paid}
        description={copy.stats.paidDescription}
        icon={Wallet}
        loading={loading}
        active={selectedStatus === "paid"}
        onClick={onSelectStatus ? () => onSelectStatus("paid") : undefined}
      />
    </div>
  );
}
