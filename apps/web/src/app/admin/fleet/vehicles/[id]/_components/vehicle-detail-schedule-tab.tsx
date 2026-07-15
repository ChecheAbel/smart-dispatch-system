"use client";

import { useEffect, useState, useMemo } from "react";
import { Calendar, Clock, MapPin, User, List, ChevronLeft, ChevronRight, Info } from "lucide-react";
import type { Vehicle, AdminRideRequest } from "@smart-dispatch/types";
import { fetchAdminRideRequests } from "@/lib/admin-ride-request-api";
import { formatEthiopianDate, gregorianToEthiopian, ETHIOPIAN_MONTHS_AM, formatEthiopianTime, ethiopianToGregorian } from "@/lib/ethiopian-calendar";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { adminCardClass, adminHeadingClass, adminIconBoxClass } from "@/lib/admin-theme";
import { cn } from "@/lib/utils";

type VehicleDetailScheduleTabProps = {
  vehicle: Vehicle;
  locale: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_AM = ["እሑድ", "ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ"];

export function VehicleDetailScheduleTab({ vehicle, locale }: VehicleDetailScheduleTabProps) {
  const [bookings, setBookings] = useState<AdminRideRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // Single Source of Truth calendar state
  const [activeMonthDate, setActiveMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());

  useEffect(() => {
    async function loadSchedule() {
      setLoading(true);
      try {
        const result = await fetchAdminRideRequests({ vehicleId: vehicle.id, limit: 100 });
        const sorted = [...result.data].sort(
          (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
        );
        setBookings(sorted);
      } catch (error) {
        console.error("Failed to load vehicle bookings", error);
      } finally {
        setLoading(false);
      }
    }
    void loadSchedule();
  }, [vehicle.id]);

  const filteredBookings = bookings;

  // Gregorian calendar calculations
  const year = activeMonthDate.getFullYear();
  const month = activeMonthDate.getMonth();

  // Derived Ethiopian Month & Year calculations
  const eth = useMemo(() => gregorianToEthiopian(activeMonthDate), [activeMonthDate]);

  const daysInMonth = useMemo(() => {
    if (locale === "am") {
      return eth.month === 13 ? ((eth.year + 1) % 4 === 0 ? 6 : 5) : 30;
    }
    return new Date(year, month + 1, 0).getDate();
  }, [year, month, eth, locale]);

  const firstDayIndex = useMemo(() => {
    if (locale === "am") {
      const firstDayDate = ethiopianToGregorian(eth.year, eth.month, 1);
      return firstDayDate.getDay();
    }
    return new Date(year, month, 1).getDay();
  }, [year, month, eth, locale]);

  const daysGrid = useMemo(() => {
    const grid: (number | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(d);
    }
    return grid;
  }, [daysInMonth, firstDayIndex]);

  // Derived Selected Day value relative to current view mode
  const selectedDayValue = useMemo(() => {
    if (!selectedDate) return null;
    if (locale === "am") {
      const ethSel = gregorianToEthiopian(selectedDate);
      if (ethSel.year === eth.year && ethSel.month === eth.month) {
        return ethSel.day;
      }
      return null;
    } else {
      if (selectedDate.getFullYear() === year && selectedDate.getMonth() === month) {
        return selectedDate.getDate();
      }
      return null;
    }
  }, [selectedDate, locale, eth, year, month]);

  const getBookingsForDay = (day: number) => {
    const cellDate =
      locale === "am"
        ? ethiopianToGregorian(eth.year, eth.month, day)
        : new Date(year, month, day);

    return filteredBookings.filter((b) => {
      const bDate = new Date(b.scheduled_at);
      return (
        bDate.getFullYear() === cellDate.getFullYear() &&
        bDate.getMonth() === cellDate.getMonth() &&
        bDate.getDate() === cellDate.getDate()
      );
    });
  };

  const selectedDayBookings = useMemo(() => {
    if (!selectedDate) return [];
    return filteredBookings.filter((b) => {
      const bDate = new Date(b.scheduled_at);
      return (
        bDate.getFullYear() === selectedDate.getFullYear() &&
        bDate.getMonth() === selectedDate.getMonth() &&
        bDate.getDate() === selectedDate.getDate()
      );
    });
  }, [selectedDate, filteredBookings]);

  const handleSelectDay = (day: number) => {
    const targetDate =
      locale === "am"
        ? ethiopianToGregorian(eth.year, eth.month, day)
        : new Date(year, month, day);
    setSelectedDate(targetDate);
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
    const formattedTime = formatEthiopianTime(new Date(booking.scheduled_at), locale);
    const requesterName = `${booking.requester.first_name} ${booking.requester.last_name}`;

    return (
      <div
        key={booking.id}
        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all text-xs"
      >
        <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-2">
          <div className="flex items-center gap-2">
            <Avatar className="size-6 border border-slate-100">
              <AvatarFallback className="text-[10px] font-bold text-white bg-[#1C3A34]">
                {requesterName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-extrabold text-slate-800">{requesterName}</span>
          </div>
          <Badge variant="outline" className={cn(
            "capitalize font-bold text-[9px] px-2 py-0.5 rounded-full border",
            booking.status === "completed" || booking.status === "confirmed"
              ? "border-emerald-250 bg-emerald-50 text-emerald-800"
              : booking.status === "in_progress"
              ? "border-blue-200 bg-blue-50 text-blue-800 animate-pulse"
              : "border-slate-200 bg-slate-50 text-slate-655"
          )}>
            {booking.status}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Transit Info</p>
            <p className="text-slate-600 font-semibold flex items-center gap-1">
              <Clock className="size-3 text-[#8f7d45]" />
              {formattedTime}
            </p>
            <p className="truncate text-slate-600">From: {booking.pickup_address}</p>
            <p className="truncate text-slate-600">To: {booking.dropoff_address}</p>
          </div>
          <div className="space-y-1 sm:border-l sm:border-slate-150 sm:pl-3">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Chauffeur</p>
            <p className="text-slate-700 font-semibold">{booking.assigned_driver?.name || "Unassigned"}</p>
            {booking.notes && <p className="text-[10px] text-slate-500 italic">"{booking.notes}"</p>}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-44 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-44 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-5 text-left font-sans antialiased">
      {/* Tab Header Controls */}
      <div className="flex items-center justify-end border-b border-slate-150 pb-4">
        {/* View Mode Toggle */}
        <div className="inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200/50 shrink-0">
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              viewMode === "calendar" ? "bg-white text-[#1C3A34] shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Calendar className="size-3.5" />
            Calendar
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
              viewMode === "list" ? "bg-white text-[#1C3A34] shadow-xs" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <List className="size-3.5" />
            List
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start">
          {/* CALENDAR VIEW */}
          <div className={cn(adminCardClass, "p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs")}>
            {/* Month Header Controller */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-sm font-extrabold text-slate-800 capitalize">{monthLabel}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-650 cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-655 cursor-pointer"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Days Grid Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
              {(locale === "am" ? WEEKDAYS_AM : WEEKDAYS).map((day) => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            {/* Days Calendar Board */}
            <div className="grid grid-cols-7 gap-1.5">
              {daysGrid.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/20 rounded-lg" />;
                }

                const dayBookings = getBookingsForDay(day);
                const hasBookings = dayBookings.length > 0;
                const isSelected = selectedDayValue === day;

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => handleSelectDay(day)}
                    className={cn(
                      "aspect-square rounded-xl flex flex-col items-center justify-between p-1.5 relative border transition-all cursor-pointer font-bold text-xs select-none",
                      isSelected
                        ? "bg-[#1C3A34] text-white border-[#1C3A34] shadow-md hover:bg-[#1C3A34]"
                        : hasBookings
                        ? "bg-slate-50 text-[#1C3A34] border-[#1C3A34]/25 hover:border-[#1C3A34] hover:bg-white"
                        : "bg-white text-slate-700 border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span className="self-start text-[10px]">{day}</span>
                    {hasBookings && (
                      <span className={cn(
                        "size-4 rounded-full text-[9px] font-extrabold flex items-center justify-center border",
                        isSelected
                          ? "bg-white text-[#1C3A34] border-white"
                          : "bg-[#1C3A34] text-white border-[#1C3A34]"
                      )}>
                        {dayBookings.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* DAY DETAILS COLUMN */}
          <div className="space-y-4">
            {selectedDate !== null ? (
              <div className={cn(adminCardClass, "p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-4 shadow-xs")}>
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="size-4 text-[#8f7d45]" />
                    {locale === "am"
                      ? formatEthiopianDate(selectedDate, "am")
                      : selectedDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                  </h3>
                  <Badge className="bg-[#1C3A34] text-white text-[10px] font-bold">
                    {selectedDayBookings.length} Trips
                  </Badge>
                </div>

                {selectedDayBookings.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayBookings.map((booking) => renderBookingCard(booking))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400">
                    <Info className="size-6 text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">No bookings scheduled on this day</p>
                  </div>
                )}
              </div>
            ) : (
              <div className={cn(adminCardClass, "p-6 rounded-2xl border border-slate-200 bg-white text-center text-slate-400 shadow-xs")}>
                <Calendar className="size-7 text-slate-350 mx-auto mb-2" />
                <p className="text-xs font-semibold">Select a day on the calendar to view assignments</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* LIST VIEW (Chrono Roadmap list) */
        <div className="space-y-4">
          {filteredBookings.length > 0 ? (
            <div className="relative border-l-2 border-[#1C3A34]/15 pl-6 ml-4 space-y-6">
              {filteredBookings.map((booking) => {
                const bDate = new Date(booking.scheduled_at);
                const formattedDate =
                  locale === "am"
                    ? `${formatEthiopianDate(bDate, "am")} (${formatEthiopianTime(bDate, "am")})`
                    : bDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                const requesterName = `${booking.requester.first_name} ${booking.requester.last_name}`;

                return (
                  <div key={booking.id} className="relative group">
                    <span className="absolute -left-[37px] top-2 flex size-7 items-center justify-center rounded-full ring-4 ring-white shadow-md bg-[#1C3A34] text-white z-10">
                      <User className="size-3.5" />
                    </span>

                    <div className={cn(
                      adminCardClass,
                      "p-5 rounded-2xl border border-slate-200 bg-white shadow-xs transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:scale-[1.005]"
                    )}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-10 border border-slate-100">
                            <AvatarFallback className="text-xs font-bold text-white bg-[#1C3A34]">
                              {requesterName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                              <span className="text-[#1C3A34] font-extrabold">{requesterName}</span>
                              <Badge className="bg-[#1C3A34]/8 text-[#1C3A34] hover:bg-[#1C3A34]/8 border-0 font-bold text-[9px] uppercase">Corporate</Badge>
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                              <Clock className="size-3.5 text-slate-400" />
                              <span className="font-medium">{formattedDate}</span>
                            </div>
                          </div>
                        </div>
                        <div className="self-start sm:self-center">
                          <Badge variant="outline" className={cn(
                            "capitalize font-bold text-[10px] px-2.5 py-0.5 rounded-full border tracking-wide",
                            booking.status === "completed" || booking.status === "confirmed"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : booking.status === "in_progress"
                              ? "border-blue-200 bg-blue-50 text-blue-800 animate-pulse"
                              : "border-slate-250 bg-slate-50 text-slate-655"
                          )}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-12 text-xs">
                        <div className="sm:col-span-7 space-y-2">
                          <p className="font-extrabold text-[10px] tracking-wider text-slate-400 uppercase">VIP Transit Route</p>
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-150/60 space-y-2 relative overflow-hidden">
                            <div className="absolute left-[20px] top-[24px] bottom-[24px] w-0.5 border-l-2 border-dashed border-slate-300" />
                            <div className="flex items-center gap-2.5 relative z-10">
                              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-bold text-emerald-800">A</span>
                              <span className="truncate font-semibold text-slate-700">{booking.pickup_address}</span>
                            </div>
                            <div className="flex items-center gap-2.5 relative z-10">
                              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[9px] font-bold text-rose-800">B</span>
                              <span className="truncate font-semibold text-slate-700">{booking.dropoff_address}</span>
                            </div>
                          </div>
                        </div>

                        <div className="sm:col-span-5 space-y-2 sm:border-l sm:border-slate-100 sm:pl-4 flex flex-col justify-between">
                          <div>
                            <p className="font-extrabold text-[10px] tracking-wider text-slate-400 uppercase">Assigned Protocol Driver</p>
                            <div className="flex items-center gap-2.5 mt-2">
                              <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 text-xs">
                                {booking.assigned_driver?.name?.charAt(0) || "D"}
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-700 text-xs">{booking.assigned_driver?.name || "Unassigned"}</p>
                                <p className="text-[10px] text-slate-400 font-medium">VIP Chauffeur Service</p>
                              </div>
                            </div>
                          </div>
                          {booking.notes && (
                            <div className="mt-3 bg-[#1C3A34]/5 border border-[#1C3A34]/10 p-2.5 rounded-xl text-[11px] text-[#1c3a34]/80 italic">
                              "{booking.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={cn(adminCardClass, "flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white")}>
              <div className="flex size-14 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200 mb-3 shadow-inner">
                <Calendar className="size-6 text-slate-300" />
              </div>
              <p className="text-sm font-extrabold text-slate-800">No bookings scheduled</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                There are no ride requests matching this filter status for this vehicle.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
