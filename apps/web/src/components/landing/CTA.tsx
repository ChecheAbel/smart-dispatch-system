export default function CTA() {
  return (
    <section className="relative py-28 bg-[#1C3A34] overflow-hidden">
      {/* Grid decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(201,184,122,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(201,184,122,0.04)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {/* Glow orb */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#C9B87A] opacity-[0.04] rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <p className="text-[#C9B87A] font-bold text-xs tracking-[0.25em] uppercase mb-5">— Ready to Optimize? —</p>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
          Unify Your Sovereign Fleet <br />
          <span className="text-[#C9B87A]">Operations Today</span>
        </h2>
        <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
          Connect your EIH subsidiary fleet databases to instantly activate AI-powered routing, real-time tracking, and automated compliance reporting.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="#contact"
            className="bg-[#C9B87A] hover:bg-[#d9ca8e] text-[#1C3A34] font-bold text-[15px] px-9 py-4 rounded-full tracking-wide transition-all duration-200 hover:shadow-2xl hover:shadow-[#C9B87A]/20 hover:-translate-y-0.5"
          >
            Request Portal Access
          </a>
          <a
            href="http://localhost:4000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 hover:border-[#C9B87A]/50 text-white font-semibold text-[15px] px-9 py-4 rounded-full tracking-wide transition-all duration-200 hover:bg-white/5"
          >
            Read API Reference
          </a>
        </div>
      </div>
    </section>
  );
}
