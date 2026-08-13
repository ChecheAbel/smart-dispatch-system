"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Map, BarChart3 } from "lucide-react";
import { useLandingMessages } from "@/hooks/use-landing-messages";

const BENEFIT_ICONS = [Map, ShieldCheck, BarChart3] as const;

export default function Benefits() {
  const copy = useLandingMessages();

  return (
    <section id="benefits" className="relative overflow-hidden bg-slate-50 py-20 sm:py-32 dark:bg-[#11161d]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(28,58,52,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(28,58,52,0.03)_1px,transparent_1px)] bg-[size:64px_64px] opacity-50 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_20%,transparent_100%)] dark:bg-[linear-gradient(to_right,rgba(201,184,122,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(201,184,122,0.06)_1px,transparent_1px)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-16 text-center sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-4 text-[10px] font-bold tracking-[0.25em] text-[var(--brand-accent)] uppercase drop-shadow-sm sm:text-xs">{copy.benefits.eyebrow}</p>
            <h2 className="px-2 text-3xl font-extrabold tracking-tight text-[var(--brand-primary)] drop-shadow-xl sm:text-4xl lg:text-5xl dark:text-[#eef1f5]">
              {copy.benefits.title}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl px-2 text-base leading-relaxed font-light text-slate-500 sm:text-lg lg:text-xl dark:text-[#8f99a6]">
              {copy.benefits.subtitle}
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:gap-10 md:grid-cols-3">
          {copy.benefits.items.map((benefit, i) => {
            const Icon = BENEFIT_ICONS[i];

            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: i * 0.2 }}
                className="group rounded-3xl border border-slate-200 bg-white p-8 shadow-md transition-all duration-300 hover:border-[var(--brand-accent)]/30 hover:shadow-2xl dark:border-white/10 dark:bg-[#171c24] dark:shadow-black/25 dark:hover:border-[#C9B87A]/30"
              >
                <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--brand-accent)]/20 bg-[var(--brand-accent)]/10 bg-white shadow-[0_0_15px_-3px_rgba(201,184,122,0.3)] transition-transform duration-300 group-hover:scale-110 dark:border-[#C9B87A]/25 dark:bg-[#11161d]">
                  <Icon className="h-8 w-8 text-[var(--brand-accent)]" strokeWidth={1.5} />
                </div>
                <h3 className="mb-4 text-2xl leading-tight font-bold text-[var(--brand-primary)] transition-colors group-hover:text-[var(--brand-accent)] dark:text-[#eef1f5]">
                  {benefit.title}
                </h3>
                <p className="leading-relaxed font-light text-slate-500 dark:text-[#8f99a6]">
                  {benefit.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
