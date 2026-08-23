"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  CalendarCheck,
  FileText,
  Radio,
  Receipt,
  ShieldCheck,
  Smartphone,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionIntro, landingSection, landingShell } from "@/components/landing/landing-ui";
import { useLandingMessages } from "@/hooks/use-landing-messages";

const STEP_ICONS = [Smartphone, Zap, Receipt] as const;
const STEP_IDS = ["01", "02", "03"] as const;
const PROOF_ICONS = [CalendarCheck, Radio, FileText, ShieldCheck] as const;

export function Proof() {
  const copy = useLandingMessages();

  return (
    <section
      aria-labelledby="proof-heading"
      className={`${landingSection} border-y border-[var(--brand-primary)]/10 bg-[#f7f6f2] dark:border-white/10 dark:bg-[#11161d]`}
    >
      <div className={landingShell}>
        <SectionIntro
          titleId="proof-heading"
          eyebrow={copy.proof.eyebrow}
          title={copy.proof.title}
          subtitle={copy.proof.subtitle}
        />
        <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {copy.proof.items.map((item, index) => {
            const Icon = PROOF_ICONS[index];
            return (
              <li key={item.title}>
                <Card className="h-full gap-0 rounded-2xl border-slate-200/80 bg-white py-0 shadow-none ring-slate-900/5 dark:border-white/10 dark:bg-[#171c24] dark:ring-white/5">
                  <CardContent className="p-5">
                    <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--brand-accent)]/12">
                      <Icon
                        className="size-5 text-[var(--brand-primary)] dark:text-[var(--brand-accent)]"
                        aria-hidden="true"
                      />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold tracking-tight text-[var(--brand-primary)] dark:text-[#eef1f5]">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-[#c5ced8]">
                      {item.body}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export default function Process() {
  const copy = useLandingMessages();
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="process"
      className={`${landingSection} overflow-hidden bg-white dark:bg-[#0d1117]`}
    >
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 size-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--brand-accent)] opacity-[0.05] blur-[150px] dark:opacity-[0.08]"
        aria-hidden="true"
      />

      <div className={`relative z-10 ${landingShell}`}>
        <SectionIntro
          eyebrow={copy.process.eyebrow}
          title={copy.process.title}
          subtitle={copy.process.subtitle}
        />

        <div className="relative mt-12 sm:mt-16">
          <div
            className="absolute top-10 right-[12%] left-[12%] hidden h-px bg-[linear-gradient(to_right,transparent,var(--brand-accent)_15%,var(--brand-accent)_85%,transparent)] opacity-50 lg:block"
            aria-hidden="true"
          />

          <ol className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            {copy.process.steps.map((step, i) => {
              const Icon = STEP_ICONS[i];
              const id = STEP_IDS[i];

              return (
                <motion.li
                  key={id}
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, delay: reduceMotion ? 0 : i * 0.08 }}
                >
                  <Card className="relative z-10 h-full gap-0 overflow-hidden rounded-2xl border-slate-200/80 bg-white py-0 shadow-none ring-slate-900/5 dark:border-white/10 dark:bg-[#171c24] dark:ring-white/5">
                    <div className="h-1 w-16 bg-[var(--brand-accent)]" aria-hidden="true" />
                    <CardContent className="p-6 sm:p-8">
                      <div className="mb-6 flex items-center justify-between gap-3">
                        <span className="flex size-12 items-center justify-center rounded-xl border border-slate-100 bg-[#f7f6f2] dark:border-white/10 dark:bg-[#11161d]">
                          <Icon className="size-6 text-[var(--brand-accent)]" aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold tracking-[0.18em] text-[var(--brand-accent)]">
                          {id}
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold tracking-tight text-[var(--brand-primary)] dark:text-[#eef1f5]">
                        {step.title}
                      </h3>
                      <p className="mt-3 leading-relaxed text-slate-600 dark:text-[#c5ced8]">
                        {step.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
