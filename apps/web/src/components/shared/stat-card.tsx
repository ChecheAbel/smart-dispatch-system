import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card
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
        "border-slate-200/80 bg-white shadow-sm min-w-0",
        comingSoon && "border-dashed bg-slate-50/60",
        isInteractive &&
          "cursor-pointer transition hover:border-[#1C3A34]/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1C3A34]/20",
        active && "border-[#1C3A34]/30 bg-[#1C3A34]/[0.03] ring-2 ring-[#1C3A34]/15",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <CardTitle className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
            {title}
          </CardTitle>
          <div
            className={cn(
              "rounded-lg bg-slate-900/8 p-2 text-slate-900",
              comingSoon && "bg-slate-900/5 text-slate-400",
            )}
          >
            <Icon className="size-4" />
          </div>
        </div>
        <CardDescription className="line-clamp-2 text-slate-500">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <p
            className={cn(
              "font-extrabold tabular-nums text-slate-900",
              comingSoon ? "text-base font-semibold text-slate-400" : "text-3xl",
            )}
          >
            {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
