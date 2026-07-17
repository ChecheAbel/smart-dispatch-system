"use client";

import BrandLogo from "@/components/landing/BrandLogo";
import { motion } from "framer-motion";
import { useLandingMessages } from "@/hooks/use-landing-messages";
import { formatMessage } from "@/translations";

export default function Footer() {
  const copy = useLandingMessages();
  const year = new Date().getFullYear();

  const platformLinks = [
    { label: copy.footer.links.booking, href: "#features" },
    { label: copy.footer.links.dispatch, href: "#features" },
    { label: copy.footer.links.fleetManagement, href: "#features" },
    { label: copy.footer.links.driverManagement, href: "#features" },
  ] as const;

  const financeLinks = [
    { label: copy.footer.links.billing, href: "#features" },
    { label: copy.footer.links.invoicing, href: "#features" },
    { label: copy.footer.links.howItWorks, href: "#process" },
  ] as const;

  const companyLinks = [
    { label: copy.footer.links.bookNow, href: "/book" },
    { label: copy.footer.links.whyChooseUs, href: "#benefits" },
    { label: copy.footer.links.aboutEih, href: "https://eih.et/about-us/", external: true },
    { label: copy.footer.links.contactEih, href: "https://eih.et/contact-us/", external: true },
  ] as const;

  return (
    <footer className="bg-[#1C3A34] text-white/60 pt-20 sm:pt-28 pb-6 sm:pb-8 relative overflow-hidden border-t border-white/5">
      <div className="absolute -bottom-1/2 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_rgba(201,184,122,0.05)_0%,_transparent_70%)] rounded-full pointer-events-none blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-10 sm:gap-14 pb-14 sm:pb-20 border-b border-white/10"
        >
          <div className="space-y-6 col-span-2 sm:col-span-2 md:col-span-1">
            <BrandLogo className="h-10 sm:h-12 drop-shadow-xl" />
            <p className="text-[13px] leading-relaxed text-white/50 font-light">
              {copy.footer.brandDescription}
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">{copy.footer.platform}</h4>
            <ul className="space-y-4 text-[14px]">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-white/60 hover:text-[#C9B87A] transition-colors font-medium">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">{copy.footer.financeConsole}</h4>
            <ul className="space-y-4 text-[14px]">
              {financeLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-white/60 hover:text-[#C9B87A] transition-colors font-medium">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">{copy.footer.company}</h4>
            <ul className="space-y-4 text-[14px]">
              {companyLinks.map((link) => (
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

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="pt-8 sm:pt-10 flex flex-col items-center gap-5 text-[12px] sm:text-[13px] text-white/40 text-center"
        >
          <span className="max-w-3xl leading-relaxed font-light">
            {formatMessage(copy.footer.copyright, { year })}
          </span>
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
          {copy.footer.developedBy}{" "}
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
