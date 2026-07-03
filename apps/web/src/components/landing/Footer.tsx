import BrandLogo from "@/components/landing/BrandLogo";

export default function Footer() {
  return (
    <footer className="bg-[#1C3A34] text-white/60 pt-12 sm:pt-16 pb-6 sm:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 pb-10 sm:pb-14 border-b border-white/10">
          {/* Brand */}
          <div className="space-y-5 col-span-2 sm:col-span-2 md:col-span-1">
            <BrandLogo className="h-9 sm:h-10" />
            <p className="text-xs leading-relaxed text-white/40">
              An all-in-one platform for booking, dispatch, fleet and driver management, billing, and invoicing.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">Platform</h4>
            <ul className="space-y-3 text-[13px]">
              {[
                { label: "Booking", href: "#features" },
                { label: "Dispatch", href: "#features" },
                { label: "Fleet Management", href: "#features" },
                { label: "Driver Management", href: "#features" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-[#C9B87A] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Finance & Console */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">Finance & Console</h4>
            <ul className="space-y-3 text-[13px]">
              {[
                { label: "Billing", href: "#features" },
                { label: "Invoicing", href: "#features" },
                { label: "Operations Console", href: "#live-view" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-[#C9B87A] transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">Company</h4>
            <ul className="space-y-3 text-[13px]">
              {[
                { label: "Request a Demo", href: "#contact" },
                { label: "Platform Overview", href: "#platform" },
                { label: "About EIH", href: "https://eih.et/about-us/", external: true },
                { label: "Contact EIH", href: "https://eih.et/contact-us/", external: true },
              ].map((link) => (
                <li key={link.label}>
                  {"external" in link && link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-[#C9B87A] transition-colors">
                      {link.label}
                    </a>
                  ) : (
                    <a href={link.href} className="hover:text-[#C9B87A] transition-colors">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 sm:pt-8 flex flex-col items-center gap-4 text-[11px] sm:text-[12px] text-white/30 text-center">
          <span className="max-w-3xl leading-relaxed">&copy; {new Date().getFullYear()} Ethiopian Investment Holdings. Smart Dispatch System. All rights reserved.</span>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a href="https://eih.et" target="_blank" rel="noopener noreferrer" className="hover:text-[#C9B87A] transition-colors">
              eih.et
            </a>
            <span className="text-white/10">|</span>
            <span className="text-white/20">v1.0.0-beta</span>
          </div>
        </div>

        <p className="pt-6 text-center text-[11px] text-white/25 tracking-wide">
          Designed and developed by{" "}
          <a
            href="https://cheche.com.et/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 font-semibold hover:text-[#C9B87A] transition-colors"
          >
            Cheche Technologies
          </a>
        </p>
      </div>
    </footer>
  );
}
