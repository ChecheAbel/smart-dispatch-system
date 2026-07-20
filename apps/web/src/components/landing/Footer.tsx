"use client";

import BrandLogo from "@/components/landing/BrandLogo";
import { motion } from "framer-motion";
import { Globe, Mail, Phone } from "lucide-react";
import { useBranding } from "@/components/shared/providers";
import { useLandingMessages } from "@/hooks/use-landing-messages";
import { formatWebsiteLabel, normalizeWebsiteHref } from "@/lib/branding";
import { formatMessage } from "@/translations";

export default function Footer() {
  const copy = useLandingMessages();
  const { branding } = useBranding();
  const year = new Date().getFullYear();
  const websiteHref = branding.website_url
    ? normalizeWebsiteHref(branding.website_url)
    : null;
  const websiteLabel = branding.website_url
    ? formatWebsiteLabel(branding.website_url)
    : null;

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
    {
      label: copy.footer.links.contactEih,
      href: websiteHref ?? "https://eih.et/contact-us/",
      external: true,
    },
  ] as const;

  return (
    <footer className="bg-[var(--brand-primary)] text-white/60 pt-20 sm:pt-28 pb-6 sm:pb-8 relative overflow-hidden border-t border-white/5">
      <div className="absolute -bottom-1/2 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--brand-accent)_5%,transparent)_0%,_transparent_70%)] rounded-full pointer-events-none blur-3xl" />

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
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{branding.product_name}</p>
              <p className="text-[13px] text-white/50">{branding.company_name}</p>
            </div>
            <p className="text-[13px] leading-relaxed text-white/50 font-light">
              {copy.footer.brandDescription}
            </p>
            {(branding.support_email || branding.support_phone || websiteHref) && (
              <ul className="space-y-2.5 pt-1 text-[13px]">
                {branding.support_email ? (
                  <li>
                    <a
                      href={`mailto:${branding.support_email}`}
                      className="inline-flex items-center gap-2 text-white/60 transition-colors hover:text-[var(--brand-accent)]"
                    >
                      <Mail className="size-3.5 shrink-0" />
                      {branding.support_email}
                    </a>
                  </li>
                ) : null}
                {branding.support_phone ? (
                  <li>
                    <a
                      href={`tel:${branding.support_phone.replace(/\s+/g, "")}`}
                      className="inline-flex items-center gap-2 text-white/60 transition-colors hover:text-[var(--brand-accent)]"
                    >
                      <Phone className="size-3.5 shrink-0" />
                      {branding.support_phone}
                    </a>
                  </li>
                ) : null}
                {websiteHref && websiteLabel ? (
                  <li>
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-white/60 transition-colors hover:text-[var(--brand-accent)]"
                    >
                      <Globe className="size-3.5 shrink-0" />
                      {websiteLabel}
                    </a>
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">
              {copy.footer.platform}
            </h4>
            <ul className="space-y-4 text-[14px]">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-[var(--brand-accent)] transition-colors font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">
              {copy.footer.financeConsole}
            </h4>
            <ul className="space-y-4 text-[14px]">
              {financeLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-white/60 hover:text-[var(--brand-accent)] transition-colors font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-[0.25em] text-white mb-6">
              {copy.footer.company}
            </h4>
            <ul className="space-y-4 text-[14px]">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white/60 hover:text-[var(--brand-accent)] transition-colors font-medium"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <a
                      href={link.href}
                      className="text-white/60 hover:text-[var(--brand-accent)] transition-colors font-medium"
                    >
                      {link.label}
                    </a>
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
            {formatMessage(copy.footer.copyright, {
              year,
              company: branding.company_name,
              product: branding.product_name,
            })}
          </span>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 font-medium">
            {websiteHref && websiteLabel ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--brand-accent)] transition-colors"
              >
                {websiteLabel}
              </a>
            ) : (
              <a
                href="https://eih.et"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[var(--brand-accent)] transition-colors"
              >
                eih.et
              </a>
            )}
            <span className="text-white/10">|</span>
            <span className="text-[color-mix(in_srgb,var(--brand-accent)_80%,transparent)] tracking-widest uppercase text-[10px]">
              v2.0.0
            </span>
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
            className="text-white/60 font-bold hover:text-[var(--brand-accent)] transition-colors"
          >
            Cheche Technologies
          </a>
        </motion.p>
      </div>
    </footer>
  );
}
