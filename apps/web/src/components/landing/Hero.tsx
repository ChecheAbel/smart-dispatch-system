export default function Hero() {
  return (
    <section className="relative w-full min-h-[calc(100dvh-72px)] flex items-center justify-center overflow-hidden bg-transparent py-12 sm:py-16 -mt-px">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#C9B87A_0%,_transparent_65%)]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(28,58,52,0.9)_1px,transparent_1px),linear-gradient(to_bottom,rgba(28,58,52,0.9)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)] opacity-30" />

      {/* Radial gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(800px,100vw)] h-[min(800px,100vw)] bg-[#C9B87A] opacity-[0.04] rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center gap-6 sm:gap-8">
        {/* Headline */}
        <h1 className="text-[2rem] leading-[1.1] sm:text-5xl lg:text-7xl font-extrabold text-white tracking-tight max-w-4xl animate-landing-fade-up [animation-delay:100ms]">
          Run Your Entire{" "}
          <span className="relative inline-block">
            <span className="bg-gradient-to-r from-[#C9B87A] via-[#e8d69a] to-[#C9B87A] bg-clip-text text-transparent">
              Mobility Operation
            </span>
            <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C9B87A]/60 to-transparent" />
          </span>
          {" "}in One Place
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg lg:text-xl text-white/60 max-w-2xl leading-relaxed font-light tracking-wide animate-landing-fade-up [animation-delay:220ms] px-1">
          Smart Dispatch is an all-in-one platform for booking, dispatching, fleet and driver management, billing, and invoicing—built for operators who need premium control at scale.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full max-w-md sm:max-w-none sm:w-auto animate-landing-fade-up [animation-delay:340ms]">
          <a
            href="#live-view"
            className="w-full sm:w-auto bg-[#C9B87A] hover:bg-[#d9ca8e] text-[#1C3A34] font-bold text-[15px] px-8 py-3.5 sm:py-4 rounded-full tracking-wide transition-all duration-200 hover:shadow-xl hover:shadow-[#C9B87A]/20 hover:-translate-y-0.5 text-center"
          >
            See the Console
          </a>
          <a
            href="#features"
            className="w-full sm:w-auto border border-white/20 hover:border-[#C9B87A]/50 text-white font-semibold text-[15px] px-8 py-3.5 sm:py-4 rounded-full tracking-wide transition-all duration-200 hover:bg-white/5 backdrop-blur-sm text-center"
          >
            Explore Features
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-2 sm:mt-6 w-full grid grid-cols-1 min-[480px]:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10 animate-landing-fade-up [animation-delay:460ms] max-w-lg min-[480px]:max-w-none">
          {[
            { num: "6+", label: "Core Modules" },
            { num: "Real-time", label: "Dispatch Engine" },
            { num: "End-to-end", label: "Billing & Invoices" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white/5 backdrop-blur-sm px-4 sm:px-6 lg:px-8 py-4 sm:py-5 text-center">
              <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#C9B87A] tracking-tight">{stat.num}</div>
              <div className="text-[10px] sm:text-xs text-white/50 mt-1 font-medium tracking-wider uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Clean wave divider */}
      <div className="absolute bottom-0 left-0 right-0 leading-none animate-landing-fade-up [animation-delay:580ms]">
        <svg viewBox="0 0 1440 72" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full" preserveAspectRatio="none">
          <path d="M0,40 C360,80 1080,0 1440,40 L1440,72 L0,72 Z" fill="#ffffff" />
        </svg>
      </div>
    </section>
  );
}
