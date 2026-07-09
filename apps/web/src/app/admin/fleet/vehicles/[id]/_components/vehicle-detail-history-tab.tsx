import { History } from "lucide-react";
import type { VehicleHistoryEvent } from "@smart-dispatch/types";
import {
  adminCardClass,
  adminHeadingClass,
  adminIconBoxClass,
} from "@/lib/admin-theme";
import { formatMessage, getAdminVehiclesMessages } from "@/translations";
import { cn } from "@/lib/utils";
import { historyIcon } from "./vehicle-detail-shared";

type VehicleDetailHistoryTabProps = {
  detail: ReturnType<typeof getAdminVehiclesMessages>["detail"];
  history: VehicleHistoryEvent[];
  historyLoading: boolean;
};

export function VehicleDetailHistoryTab({
  detail,
  history,
  historyLoading,
}: VehicleDetailHistoryTabProps) {
  return (
    <section className={cn(adminCardClass, "rounded-2xl p-4 sm:p-5 lg:p-6")}>
      <div className="mb-4 sm:mb-5">
        <h2 className={cn("text-base sm:text-lg", adminHeadingClass)}>{detail.history.title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{detail.history.emptyHint}</p>
      </div>

      {historyLoading ? (
        <div className="space-y-4">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="flex gap-3">
              <div className="size-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
              <div className="h-16 flex-1 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className={adminIconBoxClass}>
            <History className="size-5" />
          </div>
          <div className="space-y-1">
            <p className={cn("text-base", adminHeadingClass)}>{detail.history.emptyTitle}</p>
            <p className="max-w-sm text-sm text-slate-500">{detail.history.emptyHint}</p>
          </div>
        </div>
      ) : (
        <ol className="relative ml-3 space-y-0 border-l border-slate-200 sm:ml-4">
          {history.map((event) => {
            const Icon = historyIcon(event.event_type);
            return (
              <li key={event.id} className="relative pb-5 pl-5 last:pb-0 sm:pb-6 sm:pl-6">
                <span className="absolute -left-[1.05rem] top-0 flex size-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[#1C3A34] shadow-sm sm:-left-[1.15rem] sm:size-9">
                  <Icon className="size-3.5" />
                </span>
                <div className="rounded-xl border border-slate-100 bg-slate-50/40 px-3.5 py-3 transition hover:bg-white sm:px-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2">
                    <p className="text-sm font-semibold text-slate-800">{event.summary}</p>
                    <time className="text-xs text-slate-400 sm:shrink-0">
                      {new Date(event.created_at).toLocaleString()}
                    </time>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {detail.historyEventTypes[event.event_type] ?? event.event_type}
                    {event.actor?.name
                      ? ` · ${formatMessage(detail.history.by, { name: event.actor.name })}`
                      : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
