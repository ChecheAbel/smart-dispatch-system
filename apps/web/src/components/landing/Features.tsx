const features = [
  {
    icon: "📊",
    title: "Real-Time Dispatching",
    desc: "Dynamically assign and route vehicles based on live demand, port transit flows, dry-port schedules, and weather conditions.",
    tag: "Core",
  },
  {
    icon: "🔗",
    title: "Cross-Asset Tracking",
    desc: "Unified visibility over ESLSE container trucks, Ethiopian Airlines GSE, Ethio Telecom field vehicles, and corporate fleets.",
    tag: "Integrations",
  },
  {
    icon: "🔒",
    title: "Sovereign-Grade Security",
    desc: "Role-Based Access Control (RBAC) with multi-tenant isolation for managing sensitive federal logistics assets.",
    tag: "Security",
  },
  {
    icon: "📍",
    title: "Live GPS Telemetry",
    desc: "Sub-second location updates with geofencing, route deviation alerts, and predictive ETA calculations per vehicle.",
    tag: "Tracking",
  },
  {
    icon: "⚡",
    title: "Automated Route AI",
    desc: "Machine learning models optimize fuel efficiency by analyzing historical congestion, road quality, and cargo weight.",
    tag: "AI",
  },
  {
    icon: "📋",
    title: "Full Audit Trails",
    desc: "Immutable dispatch logs, driver assignment records, and route histories for regulatory compliance and annual reporting.",
    tag: "Compliance",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-[#f8f7f4] py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">— Platform Capabilities —</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1C3A34] tracking-tight">
            Built for Enterprise Scale
          </h2>
          <p className="mt-4 text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
            Capabilities engineered to support 40+ portfolio companies across 9 industry clusters.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="group bg-white rounded-2xl p-8 border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-[#C9B87A]/30 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="h-14 w-14 rounded-xl bg-[#1C3A34]/5 group-hover:bg-[#1C3A34]/10 flex items-center justify-center text-2xl transition-colors duration-300">
                  {feat.icon}
                </div>
                <span className="text-[10px] font-bold border border-[#C9B87A]/30 text-[#C9B87A] bg-[#C9B87A]/5 px-2.5 py-1 rounded-full tracking-wider uppercase">
                  {feat.tag}
                </span>
              </div>
              <h3 className="font-bold text-xl text-[#1C3A34] mb-3">{feat.title}</h3>
              <p className="text-slate-500 leading-relaxed text-[15px]">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
