"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Sunset, UserMinus } from "lucide-react";
import type { DriverShiftSummary, DriverShiftTemplate } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import { fetchDriverShiftSummary } from "@/lib/driver-shift-api";
import type { SupportedLocale } from "@/lib/locale";
import { formatMessage, getAdminDriversMessages } from "@/translations";
import { formatShiftHours, shiftTemplateLabel } from "./shift-helpers";

type ShiftStatsProps = {
  locale: SupportedLocale;
  workDate: string;
  templates: DriverShiftTemplate[];
  refreshKey?: number;
};

const emptyStats: DriverShiftSummary = {
  work_date: "",
  total_drivers: 0,
  unassigned: 0,
  by_shift: [],
};

function iconForSlug(slug: string) {
  if (slug === "afternoon") return Sunset;
  if (slug === "night") return Moon;
  return Sun;
}

export function ShiftStats({ locale, workDate, templates, refreshKey = 0 }: ShiftStatsProps) {
  const copy = getAdminDriversMessages(locale).shifts;
  const [stats, setStats] = useState<DriverShiftSummary>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const next = await fetchDriverShiftSummary(workDate);
        if (!cancelled) setStats(next);
      } catch {
        if (!cancelled) setStats(emptyStats);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [workDate, refreshKey]);

  const counts = new Map(stats.by_shift.map((row) => [row.template.id, row.count]));

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {templates.map((template) => (
        <StatCard
          key={template.id}
          icon={iconForSlug(template.slug)}
          title={shiftTemplateLabel(template, copy.templates)}
          value={counts.get(template.id) ?? 0}
          description={formatMessage(copy.stats.shiftDescription, {
            hours: formatShiftHours(template.start_time, template.end_time, locale),
          })}
          loading={loading}
        />
      ))}
      <StatCard
        icon={UserMinus}
        title={copy.stats.unassignedTitle}
        value={stats.unassigned}
        description={copy.stats.unassignedDescription}
        loading={loading}
      />
    </div>
  );
}
