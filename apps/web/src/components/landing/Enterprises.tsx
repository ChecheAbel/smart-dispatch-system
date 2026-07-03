const enterprises = [
  { icon: "🚢", name: "ESLSE",              sub: "Shipping & Logistics" },
  { icon: "✈️", name: "Ethiopian Airlines", sub: "Ground Operations"    },
  { icon: "📡", name: "Ethio Telecom",       sub: "Field Operations"     },
  { icon: "🏦", name: "CBE",                 sub: "Fleet Services"       },
  { icon: "⚡", name: "EEP",                 sub: "Grid Logistics"       },
];

export default function Enterprises() {
  return (
    <section id="enterprises" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-3">— Portfolio Integration —</p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-[#1C3A34] tracking-tight">
            Serving EIH Enterprises
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {enterprises.map((ent) => (
            <div
              key={ent.name}
              className="group bg-slate-50 hover:bg-[#1C3A34] border border-slate-200 hover:border-[#1C3A34] rounded-2xl p-6 text-center transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">{ent.icon}</div>
              <p className="font-bold text-sm text-[#1C3A34] group-hover:text-[#C9B87A] transition-colors">{ent.name}</p>
              <p className="text-[11px] text-slate-400 group-hover:text-white/60 mt-1 transition-colors">{ent.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
