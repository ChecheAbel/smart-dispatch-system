"use client";

import { useState } from "react";
import { Globe, Mail, Phone } from "lucide-react";
import { useBranding } from "@/components/shared/providers";
import { useLandingMessages } from "@/hooks/use-landing-messages";
import { formatWebsiteLabel, normalizeWebsiteHref } from "@/lib/branding";

export default function Contact() {
  const copy = useLandingMessages();
  const { branding } = useBranding();
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });

  const websiteHref = branding.website_url
    ? normalizeWebsiteHref(branding.website_url)
    : null;
  const hasSupport =
    Boolean(branding.support_email) ||
    Boolean(branding.support_phone) ||
    Boolean(websiteHref);

  return (
    <section id="contact" className="bg-[#f8f7f4] py-16 sm:py-20 lg:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-[var(--brand-accent)] font-bold text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] uppercase mb-3">
            {copy.contact.eyebrow}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--brand-primary)] tracking-tight px-2">
            {copy.contact.title}
          </h2>
          <p className="mt-3 text-slate-500 text-sm sm:text-base leading-relaxed px-2">
            {copy.contact.subtitle}
          </p>
        </div>

        {hasSupport ? (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {branding.support_email ? (
              <a
                href={`mailto:${branding.support_email}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-[var(--brand-primary)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--brand-accent)_50%,transparent)]"
              >
                <Mail className="size-3.5 text-[var(--brand-accent)]" />
                {branding.support_email}
              </a>
            ) : null}
            {branding.support_phone ? (
              <a
                href={`tel:${branding.support_phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-[var(--brand-primary)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--brand-accent)_50%,transparent)]"
              >
                <Phone className="size-3.5 text-[var(--brand-accent)]" />
                {branding.support_phone}
              </a>
            ) : null}
            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-[var(--brand-primary)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--brand-accent)_50%,transparent)]"
              >
                <Globe className="size-3.5 text-[var(--brand-accent)]" />
                {formatWebsiteLabel(branding.website_url!)}
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-8 md:p-12">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                  {copy.contact.fullName}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] focus:border-[var(--brand-primary)] transition-all"
                  placeholder={copy.contact.namePlaceholder}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                  {copy.contact.company}
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] focus:border-[var(--brand-primary)] transition-all"
                  placeholder={copy.contact.companyPlaceholder}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                {copy.contact.email}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] focus:border-[var(--brand-primary)] transition-all"
                placeholder={copy.contact.emailPlaceholder}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 tracking-[0.15em] uppercase mb-2">
                {copy.contact.message}
              </label>
              <textarea
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] focus:border-[var(--brand-primary)] transition-all resize-none"
                placeholder={copy.contact.messagePlaceholder}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[var(--brand-primary)] hover:brightness-95 text-white font-bold text-[15px] py-4 rounded-xl border-b-[3px] border-[var(--brand-accent)] tracking-wide transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
            >
              {copy.contact.submit}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
