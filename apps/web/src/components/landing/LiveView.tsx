export default function LiveView() {
  return (
    <section id="live-view" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">— Live Operations View —</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1C3A34] tracking-tight">
            Command &amp; Control Terminal
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            A unified portal for every fleet movement across EIH&apos;s sovereign enterprise portfolio.
          </p>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-200/80">
          {/* Terminal topbar */}
          <div className="bg-[#1C3A34] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400/70" />
                <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
                <span className="w-3 h-3 rounded-full bg-green-400/70" />
              </div>
              <span className="text-[#C9B87A] text-xs font-bold tracking-[0.2em] uppercase">EIH Smart Dispatch Terminal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/40 text-[10px] tracking-widest uppercase font-bold">Live</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[480px]">
            {/* Sidebar */}
            <div className="bg-slate-50 border-r border-slate-200 p-5">
              <p className="text-[9px] font-bold text-slate-400 tracking-[0.2em] uppercase mb-4 px-1">Enterprise Sectors</p>
              {[
                { icon: "🚢", label: "ESLSE Dry Ports", active: true },
                { icon: "✈️", label: "Ethiopian Airlines" },
                { icon: "💼", label: "Corporate Fleet" },
                { icon: "⚡", label: "EEP Logistics" },
                { icon: "🏨", label: "Hospitality Transit" },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1.5 cursor-pointer text-sm font-semibold transition-all ${
                    item.active
                      ? "bg-[#1C3A34] text-white shadow-md"
                      : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="text-[13px]">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Main panel */}
            <div className="col-span-3 p-6 space-y-5 bg-white">
              {/* KPI strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Active Vehicles", value: "1,482", badge: "+12%", color: "emerald" },
                  { label: "Routes Today", value: "324", badge: "On Target", color: "blue" },
                  { label: "Fuel Efficiency", value: "94.8%", badge: "Goal Met", color: "amber" },
                  { label: "Avg. Delay", value: "2.4 min", badge: "↓ 18%", color: "green" },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-2xl font-extrabold text-[#1C3A34] mt-1">{kpi.value}</p>
                    <span className={`text-[10px] font-bold ${
                      kpi.color === "amber" ? "text-[#C9B87A]" : "text-emerald-600"
                    }`}>{kpi.badge}</span>
                  </div>
                ))}
              </div>

              {/* Dispatch queue table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C3A34] uppercase tracking-wider">Active Dry Port Dispatch Queue</span>
                  <span className="text-xs text-[#C9B87A] font-bold cursor-pointer hover:underline">View Map</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { id: "ESLSE-789",  route: "Modjo Dry Port → Addis Ababa Hub",      driver: "Bekele T.",  status: "En Route",  statusColor: "amber"   },
                    { id: "ESLSE-924",  route: "Djibouti Port → Semera Dry Port",        driver: "Solomon A.", status: "Arrived",   statusColor: "emerald" },
                    { id: "ESLSE-1042", route: "Addis Ababa → Hawassa Industrial",        driver: "Tigist M.",  status: "Dispatched",statusColor: "blue"    },
                    { id: "ESLSE-1103", route: "Semera Dry Port → Mekelle Hub",           driver: "Dawit K.",   status: "Delayed",   statusColor: "red"     },
                  ].map((row) => (
                    <div key={row.id} className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <span className="text-lg">🚚</span>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{row.id}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{row.route} · {row.driver}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-[11px] font-bold rounded-full ${
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
