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
    <section id="contact" className="bg-[#f8f7f4] py-16 sm:py-20 lg:py-24 dark:bg-[#0d1117]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8 text-center sm:mb-12">
          <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-[var(--brand-accent)] uppercase sm:text-xs sm:tracking-[0.25em]">
            {copy.contact.eyebrow}
          </p>
          <h2 className="px-2 text-3xl font-extrabold tracking-tight text-[var(--brand-primary)] sm:text-4xl dark:text-[#eef1f5]">
            {copy.contact.title}
          </h2>
          <p className="mt-3 px-2 text-sm leading-relaxed text-slate-500 sm:text-base dark:text-[#8f99a6]">
            {copy.contact.subtitle}
          </p>
        </div>

        {hasSupport ? (
          <div className="mb-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {branding.support_email ? (
              <a
                href={`mailto:${branding.support_email}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-[var(--brand-primary)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--brand-accent)_50%,transparent)] dark:border-white/10 dark:bg-[#171c24] dark:text-[#e8ecf1] dark:hover:border-[#C9B87A]/40"
              >
                <Mail className="size-3.5 text-[var(--brand-accent)]" />
                {branding.support_email}
              </a>
            ) : null}
            {branding.support_phone ? (
              <a
                href={`tel:${branding.support_phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-[var(--brand-primary)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--brand-accent)_50%,transparent)] dark:border-white/10 dark:bg-[#171c24] dark:text-[#e8ecf1] dark:hover:border-[#C9B87A]/40"
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
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-[var(--brand-primary)] shadow-sm transition hover:border-[color-mix(in_srgb,var(--brand-accent)_50%,transparent)] dark:border-white/10 dark:bg-[#171c24] dark:text-[#e8ecf1] dark:hover:border-[#C9B87A]/40"
              >
                <Globe className="size-3.5 text-[var(--brand-accent)]" />
                {formatWebsiteLabel(branding.website_url!)}
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:rounded-2xl sm:p-8 md:p-12 dark:border-white/10 dark:bg-[#171c24] dark:shadow-black/30">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase dark:text-[#8f99a6]">
                  {copy.contact.fullName}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] focus:outline-none dark:border-white/10 dark:bg-[#11161d] dark:text-[#e8ecf1] dark:focus:border-[#C9B87A]/50 dark:focus:ring-[#C9B87A]/20"
                  placeholder={copy.contact.namePlaceholder}
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase dark:text-[#8f99a6]">
                  {copy.contact.company}
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] focus:outline-none dark:border-white/10 dark:bg-[#11161d] dark:text-[#e8ecf1] dark:focus:border-[#C9B87A]/50 dark:focus:ring-[#C9B87A]/20"
                  placeholder={copy.contact.companyPlaceholder}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase dark:text-[#8f99a6]">
                {copy.contact.email}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] focus:outline-none dark:border-white/10 dark:bg-[#11161d] dark:text-[#e8ecf1] dark:focus:border-[#C9B87A]/50 dark:focus:ring-[#C9B87A]/20"
                placeholder={copy.contact.emailPlaceholder}
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-bold tracking-[0.15em] text-slate-400 uppercase dark:text-[#8f99a6]">
                {copy.contact.message}
              </label>
              <textarea
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 transition-all focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--brand-primary)_20%,transparent)] focus:outline-none dark:border-white/10 dark:bg-[#11161d] dark:text-[#e8ecf1] dark:focus:border-[#C9B87A]/50 dark:focus:ring-[#C9B87A]/20"
                placeholder={copy.contact.messagePlaceholder}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl border-b-[3px] border-[var(--brand-accent)] bg-[var(--brand-primary)] py-4 text-[15px] font-bold tracking-wide text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-95 hover:shadow-xl dark:bg-[#C9B87A] dark:text-[#171a1f] dark:hover:bg-[#d8c98e]"
            >
              {copy.contact.submit}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
