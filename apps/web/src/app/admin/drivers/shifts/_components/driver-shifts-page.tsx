"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, Settings2 } from "lucide-react";
import type { DriverShiftRosterItem, DriverShiftTemplate, DriverShiftWeek } from "@smart-dispatch/types";
import { AdminDatePicker } from "@/components/shared/admin-date-picker";
import {
  DataTable,
  type DataTableColumn,
  type DataTableFetchParams,
} from "@/components/shared/data-table";
import { PageAccessDenied } from "@/components/shared/page-access-denied";
import { useAuth, useLocale } from "@/components/shared/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminBadgeGoldClass, adminSelectTriggerClass } from "@/lib/admin-theme";
import {
  assignDriverShift,
  fetchDriverShiftRoster,
  fetchDriverShiftTemplates,
  fetchDriverShiftWeek,
} from "@/lib/driver-shift-api";
import { PERMISSIONS } from "@/lib/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { getAdminDriversMessages } from "@/translations";
import { formatAssignedVehicle } from "../../_components/driver-helpers";
import { ShiftAssignSelect } from "./shift-assign-select";
import { ShiftPeriodsSheet } from "./shift-periods-sheet";
import { ShiftStats } from "./shift-stats";
import { ShiftWeekGrid } from "./shift-week-grid";
import {
  addCalendarDays,
  addisToday,
  formatShiftHours,
  parseLocalDate,
  shiftBadgeClass,
  shiftDotClass,
  shiftTemplateLabel,
  startOfIsoWeek,
  UNASSIGNED_SHIFT,
} from "./shift-helpers";

type ShiftView = "day" | "week";

export function DriverShiftsPage() {
  const { locale } = useLocale();
  const { hasPermission } = useAuth();
  const copy = getAdminDriversMessages(locale);
  const shiftsCopy = copy.shifts;
  const canRead = hasPermission(PERMISSIONS.drivers.read);
  const canWrite = hasPermission(PERMISSIONS.drivers.write);
  const [workDate, setWorkDate] = useState(addisToday);
  const [view, setView] = useState<ShiftView>("day");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [templates, setTemplates] = useState<DriverShiftTemplate[]>([]);
  const [week, setWeek] = useState<DriverShiftWeek | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekSearch, setWeekSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [periodsOpen, setPeriodsOpen] = useState(false);

  const loadTemplates = useCallback(async () => {
    const next = await fetchDriverShiftTemplates();
    setTemplates(next);
    setShiftFilter((current) => {
      if (current === "all" || current === UNASSIGNED_SHIFT) return current;
      return next.some((template) => template.slug === current) ? current : "all";
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await loadTemplates();
      } catch {
        if (!cancelled) setTemplates([]);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadTemplates]);

  useEffect(() => {
    if (view !== "week") return;
    let cancelled = false;

    async function loadWeek() {
      setWeekLoading(true);
      try {
        const next = await fetchDriverShiftWeek({ date: workDate });
        if (!cancelled) setWeek(next);
      } catch {
        if (!cancelled) setWeek(null);
      } finally {
        if (!cancelled) setWeekLoading(false);
      }
    }

    void loadWeek();
    return () => {
      cancelled = true;
    };
  }, [view, workDate, refreshKey]);

  const filterItems = useMemo(
    () => [
      { value: "all", label: shiftsCopy.filters.shiftOptions.all },
      { value: UNASSIGNED_SHIFT, label: shiftsCopy.filters.shiftOptions.unassigned },
      ...templates.map((template) => ({
        value: template.slug,
        label: shiftTemplateLabel(template, shiftsCopy.templates),
      })),
    ],
    [shiftsCopy, templates],
  );

  const handleAssign = useCallback(
    async (driverUserId: string, date: string, shiftTemplateId: string | null) => {
      try {
        await assignDriverShift({
          driver_user_id: driverUserId,
          work_date: date,
          shift_template_id: shiftTemplateId,
        });
        setRefreshKey((value) => value + 1);
        showSuccessToast({
          title: shiftsCopy.toast.saved.title,
          description: shiftsCopy.toast.saved.description,
        });
      } catch (error) {
        showErrorToast({
          title: shiftsCopy.toast.failed.title,
          description: error instanceof Error ? error.message : shiftsCopy.toast.failed.description,
        });
      }
    },
    [shiftsCopy],
  );

  const columns = useMemo<DataTableColumn<DriverShiftRosterItem>[]>(
    () => [
      {
        id: "name",
        header: shiftsCopy.columns.name,
        cellClassName: "font-medium text-slate-800",
        cell: (row) => row.driver.name,
      },
      {
        id: "mobile",
        header: shiftsCopy.columns.mobile,
        cellClassName: "text-slate-500",
        cell: (row) => row.driver.mobile_number,
      },
      {
        id: "vehicle",
        header: shiftsCopy.columns.vehicle,
        cellClassName: "text-slate-600",
        cell: (row) => formatAssignedVehicle(row.driver.assigned_vehicle) ?? "—",
      },
      {
        id: "shift",
        header: shiftsCopy.columns.shift,
        cell: (row) => {
          if (canWrite) {
            return (
              <ShiftAssignSelect
                templates={templates}
                value={row.assignment?.shift.id ?? null}
                locale={locale}
                unassignedLabel={shiftsCopy.unassigned}
                templateLabels={shiftsCopy.templates}
                onChange={(shiftTemplateId) => handleAssign(row.driver.id, workDate, shiftTemplateId)}
              />
            );
          }

          if (!row.assignment) {
            return (
              <Badge variant="outline" className={cn("text-xs", shiftBadgeClass(null))}>
                {shiftsCopy.unassigned}
              </Badge>
            );
          }

          return (
            <Badge variant="outline" className={cn("text-xs", shiftBadgeClass(row.assignment.shift.slug))}>
              {shiftTemplateLabel(row.assignment.shift, shiftsCopy.templates)}
            </Badge>
          );
        },
      },
      {
        id: "hours",
        header: shiftsCopy.columns.hours,
        cellClassName: "tabular-nums text-slate-600",
        cell: (row) =>
          row.assignment
            ? formatShiftHours(row.assignment.shift.start_time, row.assignment.shift.end_time, locale)
            : "—",
      },
    ],
    [canWrite, handleAssign, locale, shiftsCopy, templates, workDate],
  );

  const loadRoster = useCallback(
    ({ page, limit, search }: DataTableFetchParams) =>
      fetchDriverShiftRoster({
        page,
        limit,
        search: search || undefined,
        date: workDate,
        shift: shiftFilter === "all" ? undefined : shiftFilter,
      }),
    [shiftFilter, workDate],
  );

  if (!canRead) {
    return <PageAccessDenied copy={copy.accessDenied} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-border dark:bg-card">
          {(["day", "week"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={view === option ? "default" : "ghost"}
              className={cn(
                "h-8 px-3",
                view === option &&
                  "bg-[var(--brand-primary)] text-white hover:bg-[color-mix(in_srgb,var(--brand-primary)_85%,black)] dark:bg-[var(--brand-accent)] dark:text-[#171a1f]",
              )}
              onClick={() => setView(option)}
            >
              {shiftsCopy.views[option]}
            </Button>
          ))}
        </div>
        {canWrite ? (
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => setPeriodsOpen(true)}
          >
            <Settings2 />
            {shiftsCopy.periods.button}
          </Button>
        ) : null}
      </div>

      {view === "day" ? (
        <ShiftStats locale={locale} workDate={workDate} templates={templates} refreshKey={refreshKey} />
      ) : null}

      {view === "day" ? (
        <DataTable
          key={`${locale}-${workDate}-${shiftFilter}`}
          eyebrow={<Badge className={adminBadgeGoldClass}>{shiftsCopy.eyebrow}</Badge>}
          title={shiftsCopy.title}
          titleClassName="text-2xl font-extrabold tracking-tight"
          description={shiftsCopy.description}
          searchPlaceholder={shiftsCopy.searchPlaceholder}
          itemLabel={shiftsCopy.itemLabel}
          columns={columns}
          fetchData={loadRoster}
          getRowKey={(row) => row.driver.id}
          showIndexColumn
          minTableWidth="980px"
          emptyIcon={CalendarClock}
          emptyTitle={shiftsCopy.empty.title}
          emptyDescription={shiftsCopy.empty.description}
          emptySearchDescription={shiftsCopy.empty.searchDescription}
          refreshDeps={[locale, workDate, shiftFilter, refreshKey, templates, canWrite]}
          filterBar={
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminDatePicker
                id="shift-date-filter"
                label={shiftsCopy.filters.date}
                placeholder={shiftsCopy.filters.pickDate}
                value={parseLocalDate(workDate)}
                onChange={(date) => setWorkDate(date ? format(date, "yyyy-MM-dd") : addisToday())}
              />
              <div className="space-y-2">
                <Label
                  htmlFor="shift-filter"
                  className="text-sm font-medium text-[#1C3A34] dark:text-foreground"
                >
                  {shiftsCopy.filters.shift}
                </Label>
                <Select
                  items={filterItems}
                  value={shiftFilter}
                  onValueChange={(value) => setShiftFilter((value as string | null) ?? "all")}
                >
                  <SelectTrigger
                    id="shift-filter"
                    aria-label={shiftsCopy.filters.shift}
                    className={cn(adminSelectTriggerClass, "w-full")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start">
                    <SelectGroup>
                      {filterItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={cn(
                                "size-2 shrink-0 rounded-full",
                                item.value === "all" ? "invisible" : shiftDotClass(item.value),
                              )}
                            />
                            <span className="leading-none">{item.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          <ShiftWeekGrid
            week={week}
            loading={weekLoading}
            canWrite={canWrite}
            locale={locale}
            workDate={workDate}
            search={weekSearch}
            copy={{
              eyebrow: shiftsCopy.eyebrow,
              weekTitle: shiftsCopy.week.title,
              weekDescription: shiftsCopy.week.description,
              searchPlaceholder: shiftsCopy.searchPlaceholder,
              today: shiftsCopy.week.today,
              empty: shiftsCopy.empty,
              columns: shiftsCopy.columns,
              unassigned: shiftsCopy.unassigned,
              templates: shiftsCopy.templates,
              assignedCount: shiftsCopy.week.assignedCount,
              prev: shiftsCopy.week.prev,
              next: shiftsCopy.week.next,
            }}
            onSearchChange={setWeekSearch}
            onSelectDate={setWorkDate}
            onPrevWeek={() => setWorkDate(addCalendarDays(startOfIsoWeek(workDate), -7))}
            onNextWeek={() => setWorkDate(addCalendarDays(startOfIsoWeek(workDate), 7))}
            onToday={() => setWorkDate(addisToday())}
            onAssign={handleAssign}
          />
        </div>
      )}

      <ShiftPeriodsSheet
        open={periodsOpen}
        onOpenChange={setPeriodsOpen}
        locale={locale}
        templateLabels={shiftsCopy.templates}
        copy={shiftsCopy.periods}
        canWrite={canWrite}
        onChanged={() => {
          void loadTemplates().then(() => setRefreshKey((value) => value + 1));
        }}
      />
    </div>
  );
}
