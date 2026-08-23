"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Globe, Mail, Phone } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  SectionIntro,
  darkCtaClass,
  landingFieldClass,
  landingSection,
  landingShell,
} from "@/components/landing/landing-ui";
import { useBranding } from "@/components/shared/providers";
import { useLandingMessages } from "@/hooks/use-landing-messages";
import { formatWebsiteLabel, normalizeWebsiteHref } from "@/lib/branding";
import { cn } from "@/lib/utils";

const chipClass = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "h-11 cursor-pointer rounded-full border-slate-300 bg-white px-4 text-sm font-medium text-[var(--brand-primary)] hover:border-[var(--brand-accent)] hover:bg-white dark:border-white/10 dark:bg-[#171c24] dark:text-[#e8ecf1]",
);

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function Contact() {
  const copy = useLandingMessages();
  const { branding } = useBranding();
  const formId = useId();
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "mailto" | "fallback">("idle");

  const websiteHref = branding.website_url
    ? normalizeWebsiteHref(branding.website_url)
    : null;
  const hasSupport =
    Boolean(branding.support_email) ||
    Boolean(branding.support_phone) ||
    Boolean(websiteHref);

  const nameId = `${formId}-name`;
  const companyId = `${formId}-company`;
  const emailId = `${formId}-email`;
  const messageId = `${formId}-message`;
  const errorHeadingId = `${formId}-errors`;

  function validate() {
    const next: Record<string, string> = {};
    if (!formData.name.trim()) next.name = copy.contact.errors.name;
    if (!isValidEmail(formData.email)) next.email = copy.contact.errors.email;
    if (!formData.message.trim()) next.message = copy.contact.errors.message;
    return next;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setStatus("idle");
      queueMicrotask(() => errorSummaryRef.current?.focus());
      return;
    }

    const supportEmail = branding.support_email?.trim();
    if (supportEmail) {
      const subject = encodeURIComponent(
        `Smart Dispatch inquiry${formData.company.trim() ? ` — ${formData.company.trim()}` : ""}`,
      );
      const body = encodeURIComponent(
        `${formData.message.trim()}\n\n${formData.name.trim()}\n${formData.email.trim()}`,
      );
      window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
      setStatus("mailto");
      return;
    }

    setStatus("fallback");
  }

  return (
    <section
      id="contact"
      className={`${landingSection} bg-[#f7f6f2] dark:bg-[#11161d]`}
    >
      <div className={landingShell}>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <SectionIntro
              align="start"
              eyebrow={copy.contact.eyebrow}
              title={copy.contact.title}
              subtitle={copy.contact.subtitle}
            />
            {hasSupport ? (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {branding.support_email ? (
                  <a href={`mailto:${branding.support_email}`} className={chipClass}>
                    <Mail className="size-4 text-[#8a7a42]" aria-hidden="true" />
                    {branding.support_email}
                  </a>
                ) : null}
                {branding.support_phone ? (
                  <a
                    href={`tel:${branding.support_phone.replace(/\s+/g, "")}`}
                    className={chipClass}
                  >
                    <Phone className="size-4 text-[#8a7a42]" aria-hidden="true" />
                    {branding.support_phone}
                  </a>
                ) : null}
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={chipClass}
                  >
                    <Globe className="size-4 text-[#8a7a42]" aria-hidden="true" />
                    {formatWebsiteLabel(branding.website_url!)}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <Card className="gap-0 rounded-2xl border-slate-200/80 bg-white py-0 shadow-none ring-slate-900/5 dark:border-white/10 dark:bg-[#171c24] dark:ring-white/5">
            <CardContent className="p-5 sm:p-8">
              {status === "mailto" ? (
                <p role="status" className="text-base text-slate-800 dark:text-[#e8ecf1]">
                  {copy.contact.successMailto}
                </p>
              ) : null}

              {status === "fallback" ? (
                <div role="status" className="space-y-4 text-base text-slate-800 dark:text-[#e8ecf1]">
                  <p>{copy.contact.successFallback}</p>
                  <Link href="/book" className={cn(darkCtaClass, "w-auto px-6")}>
                    {copy.contact.bookInstead}
                  </Link>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={handleSubmit} noValidate>
                  {Object.keys(errors).length > 0 ? (
                    <div
                      ref={errorSummaryRef}
                      tabIndex={-1}
                      role="alert"
                      aria-labelledby={errorHeadingId}
                      className="rounded-xl border border-red-200 bg-red-50 p-4 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:outline-none dark:border-red-500/40 dark:bg-red-950/40"
                    >
                      <p
                        id={errorHeadingId}
                        className="font-semibold text-red-800 dark:text-red-200"
                      >
                        {copy.contact.errorHeading}
                      </p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-800 dark:text-red-100">
                        {errors.name ? (
                          <li>
                            <a className="cursor-pointer underline" href={`#${nameId}`}>
                              {errors.name}
                            </a>
                          </li>
                        ) : null}
                        {errors.email ? (
                          <li>
                            <a className="cursor-pointer underline" href={`#${emailId}`}>
                              {errors.email}
                            </a>
                          </li>
                        ) : null}
                        {errors.message ? (
                          <li>
                            <a className="cursor-pointer underline" href={`#${messageId}`}>
                              {errors.message}
                            </a>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor={nameId} className="text-slate-800 dark:text-[#e8ecf1]">
                        {copy.contact.fullName}{" "}
                        <span className="font-normal text-slate-500 dark:text-slate-300">
                          ({copy.contact.required})
                        </span>
                      </Label>
                      <Input
                        id={nameId}
                        name="name"
                        type="text"
                        autoComplete="name"
                        required
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? `${nameId}-error` : undefined}
                        value={formData.name}
                        onChange={(event) =>
                          setFormData({ ...formData, name: event.target.value })
                        }
                        className={landingFieldClass}
                        placeholder={copy.contact.namePlaceholder}
                      />
                      {errors.name ? (
                        <p id={`${nameId}-error`} className="mt-1 text-sm text-red-700 dark:text-red-300">
                          {errors.name}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Label htmlFor={companyId} className="text-slate-800 dark:text-[#e8ecf1]">
                        {copy.contact.company}
                      </Label>
                      <Input
                        id={companyId}
                        name="company"
                        type="text"
                        autoComplete="organization"
                        value={formData.company}
                        onChange={(event) =>
                          setFormData({ ...formData, company: event.target.value })
                        }
                        className={landingFieldClass}
                        placeholder={copy.contact.companyPlaceholder}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={emailId} className="text-slate-800 dark:text-[#e8ecf1]">
                      {copy.contact.email}{" "}
                      <span className="font-normal text-slate-500 dark:text-slate-300">
                        ({copy.contact.required})
                      </span>
                    </Label>
                    <Input
                      id={emailId}
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? `${emailId}-error` : undefined}
                      value={formData.email}
                      onChange={(event) =>
                        setFormData({ ...formData, email: event.target.value })
                      }
                      className={landingFieldClass}
                      placeholder={copy.contact.emailPlaceholder}
                    />
                    {errors.email ? (
                      <p id={`${emailId}-error`} className="mt-1 text-sm text-red-700 dark:text-red-300">
                        {errors.email}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Label htmlFor={messageId} className="text-slate-800 dark:text-[#e8ecf1]">
                      {copy.contact.message}{" "}
                      <span className="font-normal text-slate-500 dark:text-slate-300">
                        ({copy.contact.required})
                      </span>
                    </Label>
                    <Textarea
                      id={messageId}
                      name="message"
                      rows={5}
                      required
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={
                        errors.message ? `${messageId}-error` : undefined
                      }
                      value={formData.message}
                      onChange={(event) =>
                        setFormData({ ...formData, message: event.target.value })
                      }
                      className={cn(landingFieldClass, "h-auto min-h-32 resize-y")}
                      placeholder={copy.contact.messagePlaceholder}
                    />
                    {errors.message ? (
                      <p
                        id={`${messageId}-error`}
                        className="mt-1 text-sm text-red-700 dark:text-red-300"
                      >
                        {errors.message}
                      </p>
                    ) : null}
                  </div>

                  <Button type="submit" className={darkCtaClass}>
                    {copy.contact.submit}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
