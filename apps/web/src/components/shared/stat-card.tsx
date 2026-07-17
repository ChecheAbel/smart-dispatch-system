import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  loading?: boolean;
  comingSoon?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading = false,
  comingSoon = false,
  active = false,
  onClick,
  className,
}: StatCardProps) {
  const isInteractive = Boolean(onClick);

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "group relative min-w-0 rounded-xl border border-slate-200/90 bg-[#fbfcfc] p-4 transition-colors sm:p-5",
        comingSoon && "border-dashed bg-slate-50/80",
        isInteractive &&
          "cursor-pointer hover:border-[#1C3A34]/25 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C3A34]/20",
        active && "border-[#1C3A34]/30 bg-white shadow-[inset_3px_0_0_0_#C9B87A]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "min-w-0 flex-1 text-sm font-semibold tracking-tight text-[#1C3A34]",
            comingSoon && "text-slate-400",
          )}
        >
          {title}
        </p>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1C3A34]/[0.08] text-[#1C3A34]",
            comingSoon && "bg-slate-200/70 text-slate-400",
            active && "bg-[#1C3A34] text-white",
            isInteractive && !active && "group-hover:bg-[#1C3A34]/[0.12]",
          )}
        >
          <Icon className="size-4" strokeWidth={2.25} />
        </span>
      </div>

      <div className="mt-5">
        {loading ? (
          <Skeleton className="h-9 w-16 rounded-md" />
        ) : (
          <p
            className={cn(
              "text-[2rem] leading-none font-extrabold tracking-tight tabular-nums",
              comingSoon ? "text-lg font-semibold text-slate-400" : "text-[#1C3A34]",
            )}
          >
            {value}
          </p>
        )}
      </div>

      <p
        className={cn(
          "mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500",
          comingSoon && "text-slate-400",
        )}
      >
        {description}
      </p>
    </div>
  );
}
