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
  className?: string;
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  loading = false,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("border-slate-200/80 bg-white shadow-sm", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-slate-900">{title}</CardTitle>
          <div className="rounded-lg bg-slate-900/8 p-2 text-slate-900">
            <Icon className="size-4" />
          </div>
        </div>
        <CardDescription className="text-slate-500">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <p className="text-3xl font-extrabold tabular-nums text-slate-900">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}
