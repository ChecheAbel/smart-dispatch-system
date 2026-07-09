"use client";

import { useLocale } from "@/components/shared/providers";
import { getAdminNotificationTemplatesMessages } from "@/translations";
import { cn } from "@/lib/utils";

type NotificationTemplatesChannelsSummaryProps = {
  enabled: number;
  total: number;
  className?: string;
  compact?: boolean;
};

function getProgressColor(enabled: number, total: number) {
  if (enabled === 0 || total === 0) {
    return "#94a3b8";
  }

  if (enabled === total) {
    return "#1C3A34";
  }

  return "#10b981";
}

export function NotificationTemplatesChannelsSummary({
  enabled,
  total,
  className,
  compact = false,
}: NotificationTemplatesChannelsSummaryProps) {
  const { locale } = useLocale();
  const copy = getAdminNotificationTemplatesMessages(locale);
  const percent = total > 0 ? (enabled / total) * 100 : 0;
  const progressColor = getProgressColor(enabled, total);

  if (total === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white shadow-sm",
        compact ? "px-3 py-2" : "px-3.5 py-2.5",
        className,
      )}
      aria-label={copy.shell.channelsSummaryAria
        .replace("{enabled}", String(enabled))
        .replace("{total}", String(total))}
    >
      <div
        className={cn(
          "relative grid shrink-0 place-items-center",
          compact ? "size-9" : "size-10",
        )}
      >
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 36 36"
          aria-hidden
        >
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            className="stroke-slate-200"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={progressColor}
            strokeWidth="3"
            strokeDasharray={`${percent} 100`}
            pathLength={100}
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[10px] font-bold text-[#1C3A34] tabular-nums">{enabled}</span>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
          {copy.shell.channelsSummaryLabel}
        </p>
        <p className={cn("font-bold text-[#1C3A34] tabular-nums", compact ? "text-sm" : "text-sm")}>
          {enabled}
          <span className="mx-1 font-medium text-slate-300">/</span>
          {total}
        </p>
      </div>
    </div>
  );
}
