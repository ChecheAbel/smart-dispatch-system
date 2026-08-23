"use client";

import BrandLogo from "@/components/landing/BrandLogo";
import { landingNavLink, landingShell } from "@/components/landing/landing-ui";
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
    <footer className="relative overflow-hidden border-t border-white/10 bg-[var(--brand-primary)] pt-16 pb-8 text-white/70 sm:pt-20 dark:border-white/10 dark:bg-[#0d1117]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,var(--brand-accent),transparent)] opacity-70"
        aria-hidden="true"
      />

      <div className={`${landingShell} relative z-10`}>
        <div className="grid grid-cols-2 gap-10 border-b border-white/10 pb-12 sm:grid-cols-2 md:grid-cols-4 md:gap-12">
          <div className="col-span-2 space-y-5 md:col-span-1">
            <BrandLogo className="h-10 sm:h-12" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{branding.product_name}</p>
              <p className="text-sm text-white/55">{branding.company_name}</p>
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              {copy.footer.brandDescription}
            </p>
            {(branding.support_email || branding.support_phone || websiteHref) && (
              <ul className="space-y-2.5 pt-1 text-sm">
                {branding.support_email ? (
                  <li>
                    <a href={`mailto:${branding.support_email}`} className={`inline-flex items-center gap-2 ${landingNavLink}`}>
                      <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                      {branding.support_email}
                    </a>
                  </li>
                ) : null}
                {branding.support_phone ? (
                  <li>
                    <a
                      href={`tel:${branding.support_phone.replace(/\s+/g, "")}`}
                      className={`inline-flex items-center gap-2 ${landingNavLink}`}
                    >
                      <Phone className="size-3.5 shrink-0" aria-hidden="true" />
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
                      className={`inline-flex items-center gap-2 ${landingNavLink}`}
                    >
                      <Globe className="size-3.5 shrink-0" aria-hidden="true" />
                      {websiteLabel}
                    </a>
                  </li>
                ) : null}
              </ul>
            )}
          </div>

          <nav aria-label={copy.footer.platform}>
            <h2 className="mb-5 text-xs font-semibold tracking-[0.22em] text-white uppercase">
              {copy.footer.platform}
            </h2>
            <ul className="space-y-3 text-sm">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={landingNavLink}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={copy.footer.financeConsole}>
            <h2 className="mb-5 text-xs font-semibold tracking-[0.22em] text-white uppercase">
              {copy.footer.financeConsole}
            </h2>
            <ul className="space-y-3 text-sm">
              {financeLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className={landingNavLink}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={copy.footer.company}>
            <h2 className="mb-5 text-xs font-semibold tracking-[0.22em] text-white uppercase">
              {copy.footer.company}
            </h2>
            <ul className="space-y-3 text-sm">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={landingNavLink}
                    >
                      {link.label}
                    </a>
                  ) : (
                    <a href={link.href} className={landingNavLink}>
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4 pt-8 text-center text-xs text-white/45 sm:text-sm">
          <p className="max-w-3xl leading-relaxed">
            {formatMessage(copy.footer.copyright, {
              year,
              company: branding.company_name,
              product: branding.product_name,
            })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 font-medium">
            {websiteHref && websiteLabel ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className={landingNavLink}
              >
                {websiteLabel}
              </a>
            ) : (
              <a
                href="https://eih.et"
                target="_blank"
                rel="noopener noreferrer"
                className={landingNavLink}
              >
                eih.et
              </a>
            )}
            <span className="text-white/20" aria-hidden="true">
              |
            </span>
            <span className="text-[10px] tracking-[0.2em] text-[var(--brand-accent)] uppercase">
              v2.0.0
            </span>
          </div>
          <p className="pt-2 text-[11px] tracking-[0.16em] text-white/35 uppercase">
            {copy.footer.developedBy}{" "}
            <a
              href="https://cheche.com.et/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-white/70 hover:text-[var(--brand-accent)]"
            >
              Cheche Technologies
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
