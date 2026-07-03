export default function Hero() {
  return (
    <section className="relative w-full min-h-[calc(100vh-72px)] flex items-center justify-center overflow-hidden bg-[#1C3A34]">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_65%)]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(28,58,52,0.9)_1px,transparent_1px),linear-gradient(to_bottom,rgba(28,58,52,0.9)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)] opacity-30" />

      {/* Radial gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C9B87A] opacity-[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center flex flex-col items-center gap-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2.5 border border-[#C9B87A]/30 bg-[#C9B87A]/10 backdrop-blur-sm rounded-full px-5 py-2 text-[#C9B87A] text-xs font-bold tracking-[0.15em] uppercase">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C9B87A] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C9B87A]" />
          </span>
          EIH Sovereign Operations Platform
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-[1.05] tracking-tight max-w-4xl">
          Smart Dispatch for{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
              Sovereign Assets
            </span>
            <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9B87A]/60 to-transparent" />
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-lg sm:text-xl text-white/60 max-w-2xl leading-relaxed font-light tracking-wide">
          A high-performance fleet intelligence and real-time routing command center—purpose-built to streamline logistics across all EIH-managed enterprises.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto">
          <a
            href="#live-view"
            className="bg-[#C9B87A] hover:bg-[#d9ca8e] text-[#1C3A34] font-bold text-[15px] px-8 py-4 rounded-full tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#C9B87A]/20 hover:-translate-y-0.5"
          >
            Launch Fleet Control
          </a>
          <a
            href="#features"
            className="border border-white/20 hover:border-[#C9B87A]/50 text-white font-semibold text-[15px] px-8 py-4 rounded-full tracking-wide transition-all duration-200 hover:bg-white/5 backdrop-blur-sm"
          >
            Explore Features
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-6 grid grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
          {[
            { num: "40+", label: "Portfolio Companies" },
            { num: "1,482", label: "Active Vehicles" },
            { num: "94.8%", label: "Fuel Efficiency Target" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 backdrop-blur-sm px-8 py-5 text-center">
              <div className="text-3xl font-extrabold text-[#C9B87A] tracking-tight">{stat.num}</div>
              <div className="text-xs text-white/50 mt-1 font-medium tracking-wider uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Clean wave divider */}
      <div className="absolute bottom-0 left-0 right-0 leading-none">
        <svg viewBox="0 0 1440 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,72 L0,72 Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}
