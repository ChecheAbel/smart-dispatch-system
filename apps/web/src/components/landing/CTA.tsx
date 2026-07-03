export default function CTA() {
  return (
    <section className="relative py-16 sm:py-20 lg:py-28 bg-[#1C3A34] overflow-hidden">
      {/* Grid decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(201,184,122,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(201,184,122,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {/* Glow orb */}
      <div className="absolute -top-40 -right-40 w-[min(600px,100vw)] h-[min(600px,100vw)] bg-[#C9B87A] opacity-[0.04] rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <p className="text-[#C9B87A] font-bold text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-4 sm:mb-5">— Ready to Move? —</p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4 sm:mb-6 px-2">
          Upgrade to a Premium{" "}
          <span className="text-[#C9B87A]">Mobility Platform</span>
        </h2>
        <p className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-8 sm:mb-10 px-2">
          Run booking, dispatch, fleet operations, driver management, billing, and invoicing from one purpose-built system.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
          <a
            href="#contact"
            className="w-full sm:w-auto bg-[#C9B87A] hover:bg-[#d9ca8e] text-[#1C3A34] font-bold text-[15px] px-9 py-3.5 sm:py-4 rounded-full tracking-wide transition-all duration-200 hover:shadow-2xl hover:shadow-[#C9B87A]/20 hover:-translate-y-0.5 text-center"
          >
            Request a Demo
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto border border-white/20 hover:border-[#C9B87A]/50 text-white font-semibold text-[15px] px-9 py-3.5 sm:py-4 rounded-full tracking-wide transition-all duration-200 hover:bg-white/5 text-center"
          >
            Explore Features
          </a>
        </div>
      </div>
    </section>
  );
}
