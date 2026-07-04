import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ChartVariant = "bar" | "line" | "area" | "donut";

type ComingSoonChartCardProps = {
  title: string;
  description: string;
  comingSoonLabel: string;
  variant: ChartVariant;
  className?: string;
};

function ChartPlaceholder({ variant }: { variant: ChartVariant }) {
  if (variant === "donut") {
    return (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <circle cx="100" cy="60" r="38" fill="none" stroke="#e2e8f0" strokeWidth="14" />
        <circle
          cx="100"
          cy="60"
          r="38"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="14"
          strokeDasharray="150 240"
          strokeLinecap="round"
          transform="rotate(-90 100 60)"
        />
        <circle cx="100" cy="60" r="22" fill="#f8fafc" />
      </svg>
    );
  }

  if (variant === "bar") {
    const bars = [48, 72, 56, 88, 64, 92, 58, 76, 68, 84];
    return (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <line x1="16" y1="100" x2="184" y2="100" stroke="#e2e8f0" strokeWidth="1.5" />
        {bars.map((height, index) => {
          const x = 20 + index * 17;
          return (
            <rect
              key={index}
              x={x}
              y={100 - height}
              width="10"
              height={height}
              rx="2"
              fill={index % 2 === 0 ? "#e2e8f0" : "#cbd5e1"}
            />
          );
        })}
      </svg>
    );
  }

  if (variant === "area") {
    return (
      <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
        <line x1="16" y1="100" x2="184" y2="100" stroke="#e2e8f0" strokeWidth="1.5" />
        <path
          d="M16 88 L40 72 L64 78 L88 52 L112 58 L136 38 L160 44 L184 28 L184 100 L16 100 Z"
          fill="#e2e8f0"
        />
        <path
          d="M16 88 L40 72 L64 78 L88 52 L112 58 L136 38 L160 44 L184 28"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 200 120" className="h-full w-full" aria-hidden>
      <line x1="16" y1="100" x2="184" y2="100" stroke="#e2e8f0" strokeWidth="1.5" />
      <path
        d="M16 82 L40 68 L64 74 L88 48 L112 56 L136 36 L160 42 L184 26"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        [16, 82],
        [40, 68],
        [64, 74],
        [88, 48],
        [112, 56],
        [136, 36],
        [160, 42],
        [184, 26],
      ].map(([cx, cy], index) => (
        <circle key={index} cx={cx} cy={cy} r="3.5" fill="#94a3b8" />
      ))}
    </svg>
  );
}

export function ComingSoonChartCard({
  title,
  description,
  comingSoonLabel,
  variant,
  className,
}: ComingSoonChartCardProps) {
  return (
    <Card className={cn("border-dashed border-slate-200/80 bg-slate-50/60 shadow-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-900">{title}</CardTitle>
        <CardDescription className="text-slate-500">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative h-36 overflow-hidden rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 py-2">
          <ChartPlaceholder variant={variant} />
          <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-400">
              {comingSoonLabel}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
