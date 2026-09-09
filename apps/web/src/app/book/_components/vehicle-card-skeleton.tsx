import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function VehicleCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-white/10 dark:bg-[#171c24]",
        className,
      )}
    >
      {/* Image Skeleton */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-[#11161d]">
        <Skeleton className="h-full w-full rounded-none bg-slate-200/60 dark:bg-white/5" />

        {/* Bottom Overlay Badges */}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
          <Skeleton className="h-4 w-24 rounded-full bg-slate-300/80 dark:bg-white/15" />
          <Skeleton className="h-5 w-16 rounded-md bg-slate-300/80 dark:bg-white/15" />
        </div>
      </div>

      {/* Details Skeleton */}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          {/* Title */}
          <Skeleton className="h-5 w-3/5 rounded-lg bg-slate-200/80 dark:bg-white/10" />
          {/* Metadata pill */}
          <Skeleton className="h-3.5 w-2/5 rounded-md bg-slate-200/60 dark:bg-white/5" />
          {/* Notes / Description */}
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-3 w-full rounded-md bg-slate-200/50 dark:bg-white/5" />
            <Skeleton className="h-3 w-4/5 rounded-md bg-slate-200/50 dark:bg-white/5" />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-white/10">
          <Skeleton className="h-11 flex-1 rounded-xl bg-slate-200/80 dark:bg-white/10" />
          <Skeleton className="h-11 w-11 rounded-xl bg-slate-200/80 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
}

interface VehicleSkeletonGridProps {
  count?: number;
  className?: string;
}

export function VehicleSkeletonGrid({
  count = 6,
  className,
}: VehicleSkeletonGridProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {items.map((idx) => (
        <VehicleCardSkeleton key={idx} />
      ))}
    </div>
  );
}
