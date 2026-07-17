import type { ContractBillingInterval, RideRequestContractSummary } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BillingIntervalLabels = Record<ContractBillingInterval, string>;

export function formatRideRequestContractLabel(
  contract: Pick<RideRequestContractSummary, "reference_number" | "title">,
  compact = false,
) {
  if (compact) {
    return contract.reference_number;
  }

  return `${contract.reference_number} · ${contract.title}`;
}

type RideRequestContractBadgeProps = {
  contract: RideRequestContractSummary;
  billingIntervalLabels: BillingIntervalLabels;
  className?: string;
  showBillingInterval?: boolean;
  compact?: boolean;
};

export function RideRequestContractBadge({
  contract,
  billingIntervalLabels,
  className,
  showBillingInterval = true,
  compact = false,
}: RideRequestContractBadgeProps) {
  const fullLabel = formatRideRequestContractLabel(contract);

  return (
    <div
      className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}
      title={compact ? fullLabel : undefined}
    >
      <Badge
        variant="outline"
        className={cn(
          "max-w-full border-[#C9B87A]/40 bg-[#C9B87A]/10 text-[11px] font-semibold text-[#6f5f2f]",
          compact && "font-mono",
        )}
      >
        <span className="truncate">{formatRideRequestContractLabel(contract, compact)}</span>
      </Badge>
      {showBillingInterval ? (
        <Badge variant="outline" className="text-[11px] text-slate-600">
          {billingIntervalLabels[contract.billing_interval]}
        </Badge>
      ) : null}
    </div>
  );
}

type RideRequestContractSummaryCardProps = {
  contract: RideRequestContractSummary;
  billingIntervalLabels: BillingIntervalLabels;
  contractStatusLabels: Record<RideRequestContractSummary["status"], string>;
  labels: {
    reference: string;
    title: string;
    billingInterval: string;
    status: string;
    pendingHint?: string;
  };
  pending?: boolean;
};

export function RideRequestContractSummaryCard({
  contract,
  billingIntervalLabels,
  contractStatusLabels,
  labels,
  pending = false,
}: RideRequestContractSummaryCardProps) {
  return (
    <div className="space-y-3 rounded-xl border border-[#C9B87A]/30 bg-[#C9B87A]/[0.06] p-4">
      <RideRequestContractBadge
        contract={contract}
        billingIntervalLabels={billingIntervalLabels}
      />
      <dl className="grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {labels.reference}
          </dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-[#1C3A34]">
            {contract.reference_number}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {labels.title}
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-800">{contract.title}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {labels.billingInterval}
          </dt>
          <dd className="mt-1 text-sm text-slate-700">
            {billingIntervalLabels[contract.billing_interval]}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            {labels.status}
          </dt>
          <dd className="mt-1 text-sm text-slate-700">{contractStatusLabels[contract.status]}</dd>
        </div>
      </dl>
      {pending && labels.pendingHint ? (
        <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900">
          {labels.pendingHint}
        </p>
      ) : null}
    </div>
  );
}
