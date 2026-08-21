"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CalendarOff, Clock3, UserMinus, UserX } from "lucide-react";
import type { DriverAttendanceSummary } from "@smart-dispatch/types";
import { StatCard } from "@/components/shared/stat-card";
import { fetchDriverAttendanceSummary } from "@/lib/driver-attendance-api";
import type { SupportedLocale } from "@/lib/locale";
import { getAdminDriversMessages } from "@/translations";

type AttendanceStatsProps = {
  locale: SupportedLocale;
  workDate: string;
};

const emptyStats: DriverAttendanceSummary = {
  work_date: "",
  total_drivers: 0,
  present: 0,
  absent: 0,
  late: 0,
  on_leave: 0,
  off_duty: 0,
  unmarked: 0,
};

export function AttendanceStats({ locale, workDate }: AttendanceStatsProps) {
  const copy = getAdminDriversMessages(locale).attendance.stats;
  const [stats, setStats] = useState<DriverAttendanceSummary>(emptyStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const next = await fetchDriverAttendanceSummary(workDate);
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
  }, [workDate]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        icon={CalendarCheck}
        title={copy.presentTitle}
        value={stats.present}
        description={copy.presentDescription}
        loading={loading}
      />
      <StatCard
        icon={Clock3}
        title={copy.lateTitle}
        value={stats.late}
        description={copy.lateDescription}
        loading={loading}
      />
      <StatCard
        icon={UserX}
        title={copy.absentTitle}
        value={stats.absent}
        description={copy.absentDescription}
        loading={loading}
      />
      <StatCard
        icon={CalendarOff}
        title={copy.leaveTitle}
        value={stats.on_leave}
        description={copy.leaveDescription}
        loading={loading}
      />
      <StatCard
        icon={UserMinus}
        title={copy.unmarkedTitle}
        value={stats.unmarked}
        description={copy.unmarkedDescription}
        loading={loading}
      />
    </div>
  );
}
