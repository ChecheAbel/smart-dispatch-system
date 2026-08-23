"use client";

import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, Map, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SectionIntro, landingSection, landingShell } from "@/components/landing/landing-ui";
import { useLandingMessages } from "@/hooks/use-landing-messages";

const BENEFIT_ICONS = [Map, ShieldCheck, BarChart3] as const;

export default function Benefits() {
  const copy = useLandingMessages();
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="benefits"
      className={`${landingSection} overflow-hidden bg-[#f7f6f2] dark:bg-[#11161d]`}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(28,58,52,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(28,58,52,0.04)_1px,transparent_1px)] bg-size-[4rem_4rem] mask-[radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(201,184,122,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(201,184,122,0.06)_1px,transparent_1px)]"
        aria-hidden="true"
      />

      <div className={`relative z-10 ${landingShell}`}>
        <SectionIntro
          eyebrow={copy.benefits.eyebrow}
          title={copy.benefits.title}
          subtitle={copy.benefits.subtitle}
        />

        <div className="mt-12 grid grid-cols-1 gap-5 sm:mt-16 md:grid-cols-3">
          {copy.benefits.items.map((benefit, i) => {
            const Icon = BENEFIT_ICONS[i];

            return (
              <motion.div
                key={benefit.title}
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : i * 0.08 }}
              >
                <Card className="h-full gap-0 overflow-hidden rounded-2xl border-slate-200/80 bg-white py-0 shadow-none ring-slate-900/5 dark:border-white/10 dark:bg-[#171c24] dark:ring-white/5">
                  <div className="h-1 w-full bg-[var(--brand-accent)]/80" aria-hidden="true" />
                  <CardContent className="p-6 sm:p-8">
                    <span className="mb-5 flex size-12 items-center justify-center rounded-xl border border-[var(--brand-accent)]/25 bg-[#f7f6f2] dark:bg-[#11161d]">
                      <Icon
                        className="size-6 text-[var(--brand-accent)]"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </span>
                    <h3 className="text-xl font-semibold tracking-tight text-[var(--brand-primary)] dark:text-[#eef1f5]">
                      {benefit.title}
                    </h3>
                    <p className="mt-3 leading-relaxed text-slate-600 dark:text-[#c5ced8]">
                      {benefit.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
