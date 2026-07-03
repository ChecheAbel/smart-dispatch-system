export default function Footer() {
  return (
    <footer className="bg-[#1C3A34] text-white/60 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-14 border-b border-white/10">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full border border-[#C9B87A]/40 flex items-center justify-center bg-[#C9B87A]/10">
                <span className="text-[#C9B87A] font-bold text-base">E</span>
              </div>
              <div>
                <span className="font-bold text-[11px] tracking-[0.15em] uppercase text-white block">Ethiopian Investment</span>
                <span className="font-bold text-[9px] tracking-[0.2em] uppercase text-[#C9B87A] block -mt-0.5">Holdings · Smart Dispatch</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-white/40">
              Optimizing commercial performance and sovereign logistics across Ethiopia&apos;s largest state-owned portfolio companies.
            </p>
          </div>

          {/* Enterprise Assets */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">Enterprise Assets</h4>
            <ul className="space-y-3 text-[13px]">
              {[
                { label: "ESLSE Logistics", href: "https://eih.et/transport-and-logistics/" },
                { label: "Ethiopian Airlines", href: "https://eih.et/" },
                { label: "Commercial Bank", href: "https://eih.et/financial-services/" },
                { label: "Ethio Telecom", href: "https://eih.et/" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-[#C9B87A] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Dispatch System */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">Dispatcher System</h4>
            <ul className="space-y-3 text-[13px]">
              {[
                { label: "Console Monitor", href: "#live-view" },
                { label: "OpenAPI Reference", href: "http://localhost:4000/api/docs" },
                { label: "Feature Overview", href: "#features" },
                { label: "Request Access", href: "#contact" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="hover:text-[#C9B87A] transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Corporate EIH */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">Corporate EIH</h4>
            <ul className="space-y-3 text-[13px]">
              {[
                { label: "About EIH", href: "https://eih.et/about-us/" },
                { label: "Annual Reports", href: "https://eih.et/annual-report/" },
                { label: "Portfolio Overview", href: "https://eih.et/portfolio/" },
                { label: "Contact EIH", href: "https://eih.et/contact-us/" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-[#C9B87A] transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-white/30">
          <span>&copy; {new Date().getFullYear()} Ethiopian Investment Holdings. Smart Dispatch System. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="https://eih.et" target="_blank" rel="noopener noreferrer" className="hover:text-[#C9B87A] transition-colors">
              eih.et
            </a>
            <span className="text-white/10">|</span>
            <span className="text-white/20">v1.0.0-beta</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
