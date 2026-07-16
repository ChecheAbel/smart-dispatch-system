"use client";

import BrandLogo from "@/components/landing/BrandLogo";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="bg-[#1C3A34] text-white/60 pt-20 sm:pt-28 pb-6 sm:pb-8 relative overflow-hidden border-t border-white/5">
      {/* Radial glow */}
      <div className="absolute -bottom-1/2 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_rgba(201,184,122,0.05)_0%,_transparent_70%)] rounded-full pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-10 sm:gap-14 pb-14 sm:pb-20 border-b border-white/10"
        >
          {/* Brand */}
          <div className="space-y-6 col-span-2 sm:col-span-2 md:col-span-1">
            <BrandLogo className="h-10 sm:h-12 drop-shadow-xl" />
            <p className="text-[13px] leading-relaxed text-white/50 font-light">
              An all-in-one platform for booking, dispatch, fleet and driver management, billing, and invoicing. Built for modern mobility.
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">Platform</h4>
            <ul className="space-y-4 text-[14px]">
              {[
                { label: "Booking", href: "#features" },
                { label: "Dispatch", href: "#features" },
                { label: "Fleet Management", href: "#features" },
                { label: "Driver Management", href: "#features" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-white/60 hover:text-[#C9B87A] transition-colors font-medium">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Finance & Console */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">Finance & Console</h4>
            <ul className="space-y-4 text-[14px]">
              {[
                { label: "Billing", href: "#features" },
                { label: "Invoicing", href: "#features" },
                { label: "How it Works", href: "#process" },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-white/60 hover:text-[#C9B87A] transition-colors font-medium">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">Company</h4>
            <ul className="space-y-4 text-[14px]">
              {[
                { label: "Book now", href: "/register" },
                { label: "Why Choose Us", href: "#benefits" },
                { label: "About EIH", href: "https://eih.et/about-us/", external: true },
                { label: "Contact EIH", href: "https://eih.et/contact-us/", external: true },
              ].map((link) => (
                <li key={link.label}>
                  {"external" in link && link.external ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-[#C9B87A] transition-colors font-medium">
                      {link.label}
                    </a>
                  ) : (
                    <a href={link.href} className="text-white/60 hover:text-[#C9B87A] transition-colors font-medium">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="pt-8 sm:pt-10 flex flex-col items-center gap-5 text-[12px] sm:text-[13px] text-white/40 text-center"
        >
          <span className="max-w-3xl leading-relaxed font-light">&copy; {new Date().getFullYear()} Ethiopian Investment Holdings. Smart Dispatch System. All rights reserved.</span>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-medium">
            <a href="https://eih.et" target="_blank" rel="noopener noreferrer" className="hover:text-[#C9B87A] transition-colors">
              eih.et
            </a>
            <span className="text-white/10">|</span>
            <span className="text-[#C9B87A]/80 tracking-widest uppercase text-[10px]">v2.0.0</span>
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="pt-8 text-center text-[11px] text-white/30 tracking-widest uppercase"
        >
          Designed and developed by{" "}
          <a
            href="https://cheche.com.et/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/60 font-bold hover:text-[#C9B87A] transition-colors"
          >
            Cheche Technologies
          </a>
        </motion.p>
      </div>
    </footer>
  );
}
