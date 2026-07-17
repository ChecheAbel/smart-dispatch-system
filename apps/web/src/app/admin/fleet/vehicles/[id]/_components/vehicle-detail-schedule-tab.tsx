"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  User,
  List,
  ChevronLeft,
  ChevronRight,
  Info,
  MapPin,
} from "lucide-react";
import type { Vehicle, AdminRideRequest } from "@smart-dispatch/types";
import { fetchAdminRideRequests } from "@/lib/admin-ride-request-api";
import {
  formatEthiopianDate,
  gregorianToEthiopian,
  ETHIOPIAN_MONTHS_AM,
  formatEthiopianTime,
  ethiopianToGregorian,
} from "@/lib/ethiopian-calendar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { adminCardClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

type VehicleDetailScheduleTabProps = {
  vehicle: Vehicle;
  locale: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_AM = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"];

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isSameLocalDay(left: Date, right: Date) {
  return startOfLocalDay(left).getTime() === startOfLocalDay(right).getTime();
}

/** Inclusive occupancy: start day through return day (or start-only when no return). */
function bookingOccupiesDay(booking: AdminRideRequest, day: Date) {
  if (!booking.scheduled_at) return false;

  const start = startOfLocalDay(new Date(booking.scheduled_at));
  const end = startOfLocalDay(new Date(booking.scheduled_return_at ?? booking.scheduled_at));
  const cell = startOfLocalDay(day);

  return cell.getTime() >= start.getTime() && cell.getTime() <= end.getTime();
}

function bookingSpansMultipleDays(booking: AdminRideRequest) {
  if (!booking.scheduled_at || !booking.scheduled_return_at) return false;
  return (
    startOfLocalDay(new Date(booking.scheduled_at)).getTime() !==
    startOfLocalDay(new Date(booking.scheduled_return_at)).getTime()
  );
}

function formatBookingWindow(booking: AdminRideRequest, locale: string) {
  if (!booking.scheduled_at) return "—";

  const startLabel =
    locale === "am"
      ? `${formatEthiopianDate(new Date(booking.scheduled_at), "am")} ${formatEthiopianTime(new Date(booking.scheduled_at), "am")}`
      : new Date(booking.scheduled_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

  if (!booking.scheduled_return_at) {
    return startLabel;
  }

  const endLabel =
    locale === "am"
      ? `${formatEthiopianDate(new Date(booking.scheduled_return_at), "am")} ${formatEthiopianTime(new Date(booking.scheduled_return_at), "am")}`
      : new Date(booking.scheduled_return_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

  return `${startLabel} → ${endLabel}`;
}

function statusBadgeClass(status: string) {
  if (status === "completed" || status === "confirmed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "in_progress") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }
  if (status === "cancelled" || status === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function requesterInitials(booking: AdminRideRequest) {
  const first = booking.requester?.first_name?.charAt(0) ?? "";
  const last = booking.requester?.last_name?.charAt(0) ?? "";
  return `${first}${last}`.toUpperCase() || "U";
}

function requesterName(booking: AdminRideRequest) {
  const first = booking.requester?.first_name ?? "";
  const last = booking.requester?.last_name ?? "";
  return `${first} ${last}`.trim() || "Unknown requester";
}

export function VehicleDetailScheduleTab({ vehicle, locale }: VehicleDetailScheduleTabProps) {
  const [bookings, setBookings] = useState<AdminRideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [activeMonthDate, setActiveMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const result = await fetchAdminRideRequests({ vehicleId: vehicle.id, limit: 100 });
        const sorted = [...result.data].sort((a, b) => {
          const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
          const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
          return bTime - aTime;
        });
        setBookings(sorted);
      } catch (error) {
        console.error("Failed to load vehicle bookings", error);
      } finally {
        setLoading(false);
      }
    }
    void loadSchedule();
  }, [vehicle.id]);

  const year = activeMonthDate.getFullYear();
  const month = activeMonthDate.getMonth();
  const eth = useMemo(() => gregorianToEthiopian(activeMonthDate), [activeMonthDate]);
  const today = useMemo(() => startOfLocalDay(new Date()), []);

  const daysInMonth = useMemo(() => {
    if (locale === "am") {
      return eth.month === 13 ? ((eth.year + 1) % 4 === 0 ? 6 : 5) : 30;
    }
    return new Date(year, month + 1, 0).getDate();
  }, [year, month, eth, locale]);

  const firstDayIndex = useMemo(() => {
    if (locale === "am") {
      return ethiopianToGregorian(eth.year, eth.month, 1).getDay();
    }
    return new Date(year, month, 1).getDay();
  }, [year, month, eth, locale]);

  const daysGrid = useMemo(() => {
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    return grid;
  }, [daysInMonth, firstDayIndex]);

  const selectedDayValue = useMemo(() => {
    if (!selectedDate) return null;
    if (locale === "am") {
      const ethSel = gregorianToEthiopian(selectedDate);
      return ethSel.year === eth.year && ethSel.month === eth.month ? ethSel.day : null;
    }
    return selectedDate.getFullYear() === year && selectedDate.getMonth() === month
      ? selectedDate.getDate()
      : null;
  }, [selectedDate, locale, eth, year, month]);

  const getCellDate = (day: number) =>
    locale === "am"
      ? ethiopianToGregorian(eth.year, eth.month, day)
      : new Date(year, month, day);

  const getBookingsForDay = (day: number) =>
    bookings.filter((b) => bookingOccupiesDay(b, getCellDate(day)));

  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    return bookings.filter((b) => bookingOccupiesDay(b, selectedDate));
  }, [selectedDate, bookings]);

  const occupiedDaysInMonth = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate =
        locale === "am"
          ? ethiopianToGregorian(eth.year, eth.month, d)
          : new Date(year, month, d);
      if (bookings.some((b) => bookingOccupiesDay(b, cellDate))) {
        count += 1;
      }
    }
    return count;
  }, [bookings, daysInMonth, locale, eth.year, eth.month, year, month]);

  const handleSelectDay = (day: number) => {
    setSelectedDate(getCellDate(day));
  };

  const handlePrevMonth = () => {
    if (locale === "am") {
      let m = eth.month - 1;
      let y = eth.year;
      if (m < 1) {
        m = 13;
        y -= 1;
      }
      setActiveMonthDate(ethiopianToGregorian(y, m, 1));
    } else {
      setActiveMonthDate(new Date(year, month - 1, 1));
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (locale === "am") {
      let m = eth.month + 1;
      let y = eth.year;
      if (m > 13) {
        m = 1;
        y += 1;
      }
      setActiveMonthDate(ethiopianToGregorian(y, m, 1));
    } else {
      setActiveMonthDate(new Date(year, month + 1, 1));
    }
    setSelectedDate(null);
  };

  const handleGoToday = () => {
    const now = new Date();
    setActiveMonthDate(now);
    setSelectedDate(startOfLocalDay(now));
  };

  const monthLabel = useMemo(() => {
    if (locale === "am") {
      return `${ETHIOPIAN_MONTHS_AM[eth.month - 1]} ${eth.year} ዓ.ም.`;
    }
    return activeMonthDate.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });
  }, [activeMonthDate, eth, locale]);

  const renderBookingCard = (booking: AdminRideRequest) => {
    const multiDay = bookingSpansMultipleDays(booking);

    return (
      <article
        key={booking.id}
        className="rounded-xl border border-slate-200 bg-white p-3.5 transition-colors hover:border-[#1C3A34]/25"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar className="size-8 border border-slate-100">
              <AvatarFallback className="bg-[#1C3A34] text-[11px] font-bold text-white">
                {requesterInitials(booking)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-[#1C3A34]">
                {requesterName(booking)}
              </p>
              <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-500">
                <Clock className="mt-0.5 size-3 shrink-0 text-[#C9B87A]" />
                <span>{formatBookingWindow(booking, locale)}</span>
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "rounded-md border px-2 py-0.5 text-[10px] font-bold",
                statusBadgeClass(booking.status),
              )}
            >
              {formatStatusLabel(booking.status)}
            </Badge>
            {multiDay ? (
              <span className="rounded-md bg-[#C9B87A]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#1C3A34]">
                Multi-day
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          <p className="flex items-start gap-1.5 text-xs text-slate-600">
            <MapPin className="mt-0.5 size-3 shrink-0 text-emerald-600" />
            <span className="truncate">{booking.pickup_address}</span>
          </p>
          <p className="flex items-start gap-1.5 text-xs text-slate-600">
            <MapPin className="mt-0.5 size-3 shrink-0 text-rose-500" />
            <span className="truncate">{booking.dropoff_address}</span>
          </p>
          <p className="pt-1 text-xs text-slate-500">
            Driver:{" "}
            <span className="font-semibold text-slate-700">
              {booking.assigned_driver?.name || "Unassigned"}
            </span>
          </p>
        </div>
      </article>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left font-sans antialiased">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-[#1C3A34]">Vehicle schedule</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {occupiedDaysInMonth} occupied day{occupiedDaysInMonth === 1 ? "" : "s"} this month
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              viewMode === "calendar"
                ? "bg-[#1C3A34] text-white"
                : "text-slate-500 hover:text-[#1C3A34]",
            )}
          >
            <Calendar className="size-3.5" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
              viewMode === "list"
                ? "bg-[#1C3A34] text-white"
                : "text-slate-500 hover:text-[#1C3A34]",
            )}
          >
            <List className="size-3.5" />
            List
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="flex size-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white hover:text-[#1C3A34]"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <h4 className="min-w-[10rem] text-center text-base font-extrabold capitalize text-[#1C3A34]">
                  {monthLabel}
                </h4>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="flex size-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white hover:text-[#1C3A34]"
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={handleGoToday}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#1C3A34] transition-colors hover:border-[#1C3A34]/30"
              >
                Today
              </button>
            </div>

            <div className="border-b border-slate-200 bg-white">
              <div className="grid grid-cols-7">
                {(locale === "am" ? WEEKDAYS_AM : WEEKDAYS).map((day) => (
                  <div
                    key={day}
                    className="border-r border-slate-100 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500 [&:nth-child(7n)]:border-r-0"
                  >
                    {day}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200">
              {daysGrid.map((day, idx) => {
                if (day === null) {
                  return (
                    <div
                      key={`empty-${idx}`}
                      className="min-h-[5.5rem] border-b border-r border-slate-100 bg-slate-50/60 [&:nth-child(7n)]:border-r-0"
                    />
                  );
                }

                const cellDate = getCellDate(day);
                const dayBookings = getBookingsForDay(day);
                const hasBookings = dayBookings.length > 0;
                const isSelected = selectedDayValue === day;
                const isToday = isSameLocalDay(cellDate, today);
                const visibleBookings = dayBookings.slice(0, 2);
                const overflowCount = dayBookings.length - visibleBookings.length;

                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      "group relative flex min-h-[5.5rem] flex-col items-stretch border-b border-r border-slate-100 p-1.5 text-left transition-colors [&:nth-child(7n)]:border-r-0",
                      isSelected
                        ? "bg-[#1C3A34]/[0.06] ring-2 ring-inset ring-[#1C3A34]"
                        : "bg-white hover:bg-slate-50/80",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-end">
                      <span
                        className={cn(
                          "inline-flex size-7 items-center justify-center text-[13px] font-bold",
                          isToday
                            ? "rounded-full bg-[#1C3A34] text-white"
                            : isSelected
                              ? "rounded-full bg-[#C9B87A]/25 text-[#1C3A34]"
                              : "text-slate-700",
                        )}
                      >
                        {day}
                      </span>
                    </div>

                    {hasBookings ? (
                      <div className="mt-auto flex min-w-0 flex-col gap-0.5">
                        {visibleBookings.map((booking) => {
                          const multiDay = bookingSpansMultipleDays(booking);
                          return (
                            <span
                              key={booking.id}
                              className={cn(
                                "truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight",
                                multiDay
                                  ? "bg-[#C9B87A]/25 text-[#1C3A34]"
                                  : booking.status === "in_progress"
                                    ? "bg-blue-100 text-blue-800"
                                    : booking.status === "completed"
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-[#1C3A34]/10 text-[#1C3A34]",
                              )}
                            >
                              {requesterName(booking)}
                            </span>
                          );
                        })}
                        {overflowCount > 0 ? (
                          <span className="px-1 text-[10px] font-bold text-slate-500">
                            +{overflowCount} more
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-[11px] font-medium text-slate-500 sm:px-5">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[#1C3A34]/25" />
                Single-day
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[#C9B87A]" />
                Multi-day
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex size-4 items-center justify-center rounded-full bg-[#1C3A34] text-[8px] font-bold text-white">
                  {locale === "am" ? gregorianToEthiopian(today).day : today.getDate()}
                </span>
                Today
              </span>
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {selectedDate ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Selected day
                    </p>
                    <h4 className="mt-0.5 text-sm font-extrabold text-[#1C3A34]">
                      {locale === "am"
                        ? formatEthiopianDate(selectedDate, "am")
                        : selectedDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                    </h4>
                  </div>
                  <span className="rounded-lg bg-[#1C3A34] px-2.5 py-1 text-[11px] font-bold text-white">
                    {selectedDayBookings.length} trip
                    {selectedDayBookings.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="max-h-[32rem] space-y-3 overflow-y-auto p-4 sm:p-5">
                  {selectedDayBookings.length > 0 ? (
                    selectedDayBookings.map((booking) => renderBookingCard(booking))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-slate-50">
                        <Info className="size-5 text-slate-300" />
                      </div>
                      <p className="text-sm font-bold text-slate-700">No bookings</p>
                      <p className="mt-1 max-w-[14rem] text-xs text-slate-500">
                        This vehicle is free on the selected day.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <Calendar className="mb-3 size-8 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">Pick a day</p>
                <p className="mt-1 text-xs text-slate-500">
                  Select a date to review trip assignments.
                </p>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.length > 0 ? (
            <div className="relative ml-4 space-y-6 border-l-2 border-[#1C3A34]/15 pl-6">
              {bookings.map((booking) => {
                const formattedDate = formatBookingWindow(booking, locale);
                const name = requesterName(booking);

                return (
                  <div key={booking.id} className="relative">
                    <span className="absolute -left-[37px] top-2 z-10 flex size-7 items-center justify-center rounded-full bg-[#1C3A34] text-white shadow-md ring-4 ring-white">
                      <User className="size-3.5" />
                    </span>

                    <div
                      className={cn(
                        adminCardClass,
                        "rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md",
                      )}
                    >
                      <div className="mb-4 flex flex-col justify-between gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-start">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 border border-slate-100">
                            <AvatarFallback className="bg-[#1C3A34] text-xs font-bold text-white">
                              {requesterInitials(booking)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-sm font-extrabold text-[#1C3A34]">{name}</h3>
                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                              <Clock className="size-3.5 text-slate-400" />
                              <span className="font-medium">{formattedDate}</span>
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
                            statusBadgeClass(booking.status),
                          )}
                        >
                          {formatStatusLabel(booking.status)}
                        </Badge>
                      </div>

                      <div className="grid gap-4 text-xs sm:grid-cols-12">
                        <div className="space-y-2 sm:col-span-7">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            Route
                          </p>
                          <div className="relative space-y-2 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-3">
                            <div className="absolute bottom-6 left-5 top-6 w-0.5 border-l-2 border-dashed border-slate-300" />
                            <div className="relative z-10 flex items-center gap-2.5">
                              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-800">
                                A
                              </span>
                              <span className="truncate font-semibold text-slate-700">
                                {booking.pickup_address}
                              </span>
                            </div>
                            <div className="relative z-10 flex items-center gap-2.5">
                              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[9px] font-bold text-rose-800">
                                B
                              </span>
                              <span className="truncate font-semibold text-slate-700">
                                {booking.dropoff_address}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between space-y-2 sm:col-span-5 sm:border-l sm:border-slate-100 sm:pl-4">
                          <div>
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                              Driver
                            </p>
                            <p className="mt-2 text-xs font-extrabold text-slate-700">
                              {booking.assigned_driver?.name || "Unassigned"}
                            </p>
                          </div>
                          {booking.notes ? (
                            <div className="rounded-xl border border-[#1C3A34]/10 bg-[#1C3A34]/5 p-2.5 text-[11px] italic text-[#1C3A34]/80">
                              &ldquo;{booking.notes}&rdquo;
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className={cn(
                adminCardClass,
                "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center",
              )}
            >
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200">
                <Calendar className="size-6 text-slate-300" />
              </div>
              <p className="text-sm font-extrabold text-slate-800">No bookings scheduled</p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                There are no ride requests assigned to this vehicle yet.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
