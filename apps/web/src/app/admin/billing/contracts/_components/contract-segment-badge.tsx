import type { RequesterSegment } from "@smart-dispatch/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function requesterSegmentBadgeClass(segment: RequesterSegment) {
  switch (segment) {
    case "business":
      return "border-violet-200 bg-violet-50 text-violet-800";
    case "government":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
}

type ContractSegmentBadgeProps = {
  segment: RequesterSegment;
  label: string;
  className?: string;
};

export function ContractSegmentBadge({ segment, label, className }: ContractSegmentBadgeProps) {
  return (
    <Badge className={cn("text-xs", requesterSegmentBadgeClass(segment), className)}>
      {label}
    </Badge>
  );
}
