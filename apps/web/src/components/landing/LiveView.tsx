import { CalendarCheck, Car, FileText, Radio, Receipt, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const sidebarModules: { icon: LucideIcon; label: string; active?: boolean }[] = [
  { icon: CalendarCheck, label: "Booking",  active: true },
  { icon: Radio,         label: "Dispatch" },
  { icon: Car,           label: "Fleet" },
  { icon: Users,         label: "Drivers" },
  { icon: Receipt,       label: "Billing" },
  { icon: FileText,      label: "Invoices" },
];

export default function LiveView() {
  return (
    <section id="live-view" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-3">Operations Console</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#1C3A34] tracking-tight px-2">
            Your Dispatch Command Center
          </h2>
          <p className="mt-3 sm:mt-4 text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed px-2">
            Monitor bookings, active trips, fleet status, and revenue from a single real-time operations dashboard.
          </p>
        </div>

        <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 shadow-xl sm:shadow-2xl shadow-slate-200/80">
          {/* Terminal topbar */}
          <div className="bg-[#1C3A34] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="flex gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-400/70" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-400/70" />
                <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400/70" />
              </div>
              <span className="text-[#C9B87A] text-[10px] sm:text-xs font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase truncate">
                Smart Dispatch Console
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/40 text-[9px] sm:text-[10px] tracking-widest uppercase font-bold">Live</span>
            </div>
          </div>

          {/* Mobile module pills */}
          <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-4 py-3">
            <p className="text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-2.5">Platform Modules</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {sidebarModules.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                    item.active
                      ? "bg-[#1C3A34] text-white shadow-md"
                      : "bg-white text-slate-500 border border-slate-200"
                  }`}
                >
                  <item.icon className={`h-3.5 w-3.5 shrink-0 ${item.active ? "text-[#C9B87A]" : ""}`} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 lg:min-h-[480px]">
            {/* Desktop sidebar */}
            <div className="hidden lg:block bg-slate-50 border-r border-slate-200 p-5">
              <p className="text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-4 px-1">Platform Modules</p>
              {sidebarModules.map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1.5 cursor-pointer text-sm font-semibold transition-all ${
                    item.active
                      ? "bg-[#1C3A34] text-white shadow-md"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${item.active ? "text-[#C9B87A]" : ""}`} />
                  <span className="text-[13px]">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Main panel */}
            <div className="lg:col-span-3 p-4 sm:p-6 space-y-4 sm:space-y-5 bg-white">
              {/* KPI strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: "Active Requests", value: "47",   badge: "+8 today",  color: "emerald" },
                  { label: "Active Trips", value: "23", badge: "On track", color: "blue" },
                  { label: "Compliance Alerts", value: "16", badge: "Needs attention", color: "amber" },
                  { label: "Revenue Today", value: "184K ETB", badge: "↑ 12%", color: "green" },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 sm:p-4">
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-tight">{kpi.label}</p>
                    <p className="text-xl sm:text-2xl font-extrabold text-[#1C3A34] mt-1">{kpi.value}</p>
                    <span className={`text-[9px] sm:text-[10px] font-bold ${
                      kpi.color === "amber" ? "text-[#C9B87A]" : "text-emerald-600"
                    }`}>{kpi.badge}</span>
                  </div>
                ))}
              </div>

              {/* Dispatch queue table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 sm:px-5 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[10px] sm:text-xs font-bold text-[#1C3A34] uppercase tracking-wider">Active Trip Queue</span>
                  <span className="text-[10px] sm:text-xs text-[#C9B87A] font-bold cursor-pointer hover:underline shrink-0">View Map</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { id: "BK-2041", route: "Bole → Kazanchis",           driver: "Bekele T.",  status: "En Route",   statusColor: "amber"   },
                    { id: "BK-2038", route: "Piassa → CMC",               driver: "Solomon A.", status: "Arrived",    statusColor: "emerald" },
                    { id: "BK-2045", route: "Airport T2 → Sheraton",      driver: "Tigist M.",  status: "Dispatched", statusColor: "blue"    },
                    { id: "BK-2032", route: "Megenagna → Sarbet",         driver: "Dawit K.",   status: "Delayed",    statusColor: "red"     },
                  ].map((row) => (
                    <div key={row.id} className="px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-[#1C3A34]/5 flex items-center justify-center shrink-0">
                          <Car className="h-4 w-4 text-[#1C3A34]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-900">{row.id}</p>
                          <p className="text-xs text-slate-500 mt-0.5 truncate sm:whitespace-normal">{row.route} · {row.driver}</p>
                        </div>
                      </div>
                      <span className={`self-start sm:self-auto px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-full whitespace-nowrap ${
                        row.statusColor === "amber"   ? "bg-amber-50 text-amber-700 border border-amber-200" :
                        row.statusColor === "emerald" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        row.statusColor === "blue"    ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        "bg-red-50 text-red-700 border border-red-200"
                      }`}>{row.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
